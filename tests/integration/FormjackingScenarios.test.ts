/**
 * 폼재킹 시나리오 통합 테스트
 * HeuristicEngine + RuleRegistry + Rules 조합 테스트
 */

import {
  createNetworkRequest,
  NetworkRequestType
} from '@domain/entities/NetworkRequest';
import { createSensitiveInput } from '@domain/entities/SensitiveInput';
import { DetectionContext } from '@domain/ports/IDetectionEngine';
import { createRuleRegistry, RuleRegistry } from '@domain/rules/RuleRegistry';
import {
  createHeuristicEngine,
  HeuristicEngine
} from '@domain/services/HeuristicEngine';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';
import { Verdict } from '@domain/value-objects/Verdict';

describe('Formjacking Scenarios Integration Tests', () => {
  let engine: HeuristicEngine;
  let registry: RuleRegistry;

  beforeEach(() => {
    engine = createHeuristicEngine();
    registry = createRuleRegistry();

    // 레지스트리의 모든 규칙을 엔진에 등록
    for (const rule of registry.getAll()) {
      engine.registerRule(rule);
    }
  });

  /**
   * 테스트 컨텍스트 생성 헬퍼
   */
  function createContext(options: {
    targetDomain: string;
    currentDomain: string;
    requestType?: NetworkRequestType;
    timeSinceInput?: number;
    fieldType?: SensitiveFieldType;
    payloadSize?: number;
    hasRecentInput?: boolean;
  }): DetectionContext {
    const now = Date.now();
    const {
      targetDomain,
      currentDomain,
      requestType = NetworkRequestType.FETCH,
      timeSinceInput = 200,
      fieldType = SensitiveFieldType.CARD_NUMBER,
      payloadSize = 256,
      hasRecentInput = true
    } = options;

    const recentInputs = hasRecentInput
      ? [
          createSensitiveInput({
            fieldId: 'card-input',
            fieldType,
            inputLength: 16,
            timestamp: now - timeSinceInput,
            domPath: 'form > input'
          })
        ]
      : [];

    return {
      request: createNetworkRequest({
        type: requestType,
        url: `https://${targetDomain}/api/collect`,
        method: 'POST',
        payloadSize,
        timestamp: now
      }),
      recentInputs,
      currentDomain
    };
  }

  describe('실제 폼재킹 공격 시나리오', () => {
    it('시나리오 1: 카드 입력 직후 외부 악성 도메인으로 전송', () => {
      const context = createContext({
        targetDomain: 'analytics-track.info', // D002 악성 도메인
        currentDomain: 'shop.example.com',
        timeSinceInput: 150, // D001 즉시 전송
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.matchedRules.length).toBeGreaterThan(0);
    });

    it('시나리오 2: 타이포스쿼팅 도메인으로 카드 정보 전송', () => {
      const context = createContext({
        targetDomain: 'g00gle-analytics.com', // D002 타이포스쿼팅
        currentDomain: 'legitimate-shop.com',
        timeSinceInput: 300,
        fieldType: SensitiveFieldType.CVV
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      expect(result.matchedRules.some((r) => r.ruleId === 'D002')).toBe(true);
    });

    it('시나리오 3: 가짜 CDN 도메인으로 민감 정보 전송', () => {
      const context = createContext({
        targetDomain: 'cdn1.malware.info', // D003 가짜 CDN
        currentDomain: 'shop.example.com',
        timeSinceInput: 2000, // 2초 (D001 미매칭, D003만 매칭)
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      expect(result.matchedRules.some((r) => r.ruleId === 'D003')).toBe(true);
    });

    it('시나리오 4: 카드 정보를 분석 서비스로 전송', () => {
      const context = createContext({
        targetDomain: 'www.google-analytics.com', // D004 분석 서비스
        currentDomain: 'shop.example.com',
        timeSinceInput: 500, // 500ms (D004 1초 이내)
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      expect(result.matchedRules.some((r) => r.ruleId === 'D004')).toBe(true);
    });

    it('시나리오 5: Beacon API로 외부에 민감 정보 유출', () => {
      const context = createContext({
        targetDomain: 'evil-collector.com',
        currentDomain: 'shop.example.com',
        requestType: NetworkRequestType.BEACON, // D005 Beacon
        timeSinceInput: 1500, // 1.5초 (D005 3초 이내)
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      expect(result.matchedRules.some((r) => r.ruleId === 'D005')).toBe(true);
    });

    it('시나리오 6: 의심스러운 TLD 도메인으로 전송', () => {
      const context = createContext({
        targetDomain: 'pay.tk', // D002 suspicious TLD
        currentDomain: 'shop.example.com',
        timeSinceInput: 100,
        fieldType: SensitiveFieldType.PASSWORD
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
    });
  });

  describe('정상 결제 시나리오', () => {
    it('시나리오 7: Stripe로 카드 정보 전송', () => {
      const context = createContext({
        targetDomain: 'api.stripe.com', // S001 결제 게이트웨이
        currentDomain: 'shop.example.com',
        timeSinceInput: 5000, // 5초 전 (D001 미매칭)
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.SAFE);
      expect(result.matchedRules.some((r) => r.ruleId === 'S001')).toBe(true);
    });

    it('시나리오 8: PayPal로 결제 정보 전송', () => {
      const context = createContext({
        targetDomain: 'www.paypal.com', // S001 결제 게이트웨이
        currentDomain: 'shop.example.com',
        timeSinceInput: 3000,
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.SAFE);
    });

    it('시나리오 9: 토스페이먼츠로 결제 정보 전송', () => {
      const context = createContext({
        targetDomain: 'api.tosspayments.com', // S001 한국 결제
        currentDomain: 'shop.korea.com',
        timeSinceInput: 2000,
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.SAFE);
      expect(result.matchedRules.some((r) => r.ruleId === 'S001')).toBe(true);
      // gateway 정보는 matchedRules[0].checkResult.details에 있음
      const s001Match = result.matchedRules.find((r) => r.ruleId === 'S001');
      expect(s001Match?.checkResult.details?.gateway).toBe('토스페이먼츠');
    });

    it('시나리오 10: 동일 도메인으로 데이터 전송', () => {
      const context = createContext({
        targetDomain: 'api.shop.example.com', // S002 동일 도메인
        currentDomain: 'shop.example.com',
        timeSinceInput: 100, // 빠른 전송이지만 동일 도메인
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.SAFE);
      expect(result.matchedRules.some((r) => r.ruleId === 'S002')).toBe(true);
    });

    it('시나리오 11: 분석 서비스로 비민감 데이터 전송', () => {
      const context = createContext({
        targetDomain: 'www.google-analytics.com', // S003 분석 서비스
        currentDomain: 'shop.example.com',
        timeSinceInput: 5000, // 5초 전 (D004 1초 초과)
        fieldType: SensitiveFieldType.EMAIL // 비민감 필드
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.SAFE);
      expect(result.matchedRules.some((r) => r.ruleId === 'S003')).toBe(true);
    });
  });

  describe('경계 케이스 및 UNKNOWN 시나리오', () => {
    it('시나리오 12: 500ms 정확히 경과 후 외부 전송 (D001 미매칭)', () => {
      const context = createContext({
        targetDomain: 'unknown-external.com',
        currentDomain: 'shop.example.com',
        timeSinceInput: 500, // 정확히 500ms (D001 조건: < 500)
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      // D001 미매칭, 다른 규칙도 해당 없음
      expect(result.matchedRules.every((r) => r.ruleId !== 'D001')).toBe(true);
    });

    it('시나리오 13: 민감 입력 없이 외부 전송', () => {
      const context = createContext({
        targetDomain: 'external.com',
        currentDomain: 'shop.example.com',
        hasRecentInput: false // 민감 입력 없음
      });

      const result = engine.analyze(context);

      // 민감 입력이 없으면 대부분의 위험 규칙 미매칭
      expect(result.verdict).toBe(Verdict.UNKNOWN);
    });

    it('시나리오 14: 알 수 없는 외부 도메인 (오래된 입력)', () => {
      const context = createContext({
        targetDomain: 'unknown-service.com',
        currentDomain: 'shop.example.com',
        timeSinceInput: 10000, // 10초 전 (모든 타이밍 규칙 미매칭)
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      // 위험/안전 규칙 모두 미매칭 → UNKNOWN
      expect(result.verdict).toBe(Verdict.UNKNOWN);
    });
  });

  describe('규칙 우선순위 테스트', () => {
    it('여러 위험 규칙 매칭 시 가장 높은 우선순위 규칙이 먼저 처리됨', () => {
      // D001(100) + D002(99) 동시 매칭 시나리오
      const context = createContext({
        targetDomain: 'analytics-track.info', // D002 악성 도메인
        currentDomain: 'shop.example.com',
        timeSinceInput: 100, // D001 즉시 전송
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      expect(result.matchedRules.length).toBeGreaterThanOrEqual(2);
      // 첫 번째 매칭 규칙이 D001(우선순위 100)
      expect(result.matchedRules[0]?.ruleId).toBe('D001');
    });

    it('위험 규칙 매칭 시 안전 규칙은 실행되지 않음', () => {
      // D001 매칭 + S001도 매칭 가능한 상황
      // 하지만 위험 규칙이 먼저 매칭되면 안전 규칙 스킵
      const context = createContext({
        targetDomain: 'analytics-track.info', // D002 악성 도메인
        currentDomain: 'shop.example.com',
        timeSinceInput: 100,
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      // 안전 규칙은 매칭되지 않음
      expect(result.matchedRules.every((r) => !r.ruleId.startsWith('S'))).toBe(
        true
      );
    });
  });

  describe('규칙 비활성화 테스트', () => {
    it('비활성화된 규칙은 실행되지 않음', () => {
      // D001 비활성화
      engine.setRuleEnabled('D001', false);

      const context = createContext({
        targetDomain: 'external.com',
        currentDomain: 'shop.example.com',
        timeSinceInput: 100, // D001 조건 충족하지만 비활성화됨
        fieldType: SensitiveFieldType.CARD_NUMBER
      });

      const result = engine.analyze(context);

      // D001이 비활성화되어 매칭되지 않음
      expect(result.matchedRules.every((r) => r.ruleId !== 'D001')).toBe(true);
    });
  });

  describe('탐지율 검증', () => {
    const attackScenarios = [
      {
        name: '즉시 외부 전송',
        targetDomain: 'malicious.com',
        timeSinceInput: 100
      },
      {
        name: '악성 도메인',
        targetDomain: 'analytics-track.info',
        timeSinceInput: 1000
      },
      {
        name: '타이포스쿼팅',
        targetDomain: 'stripe-api.net',
        timeSinceInput: 300
      },
      {
        name: '가짜 CDN',
        targetDomain: 'cdn1.collect.xyz',
        timeSinceInput: 2000
      },
      {
        name: '분석 서비스 악용',
        targetDomain: 'www.google-analytics.com',
        timeSinceInput: 500
      },
      {
        name: 'Beacon 유출',
        targetDomain: 'evil.com',
        timeSinceInput: 1000,
        requestType: NetworkRequestType.BEACON
      },
      {
        name: '의심 TLD',
        targetDomain: 'pay.tk',
        timeSinceInput: 200
      },
      {
        name: '가짜 분석',
        targetDomain: 'analytics1.track.net',
        timeSinceInput: 1500
      },
      {
        name: '난독화 도메인',
        targetDomain: 'abcdefghijklmnopqrstuvwxyz123456.com',
        timeSinceInput: 300
      },
      {
        name: '가짜 정적 서버',
        targetDomain: 'static1.malware.info',
        timeSinceInput: 2000
      }
    ];

    it('공격 시나리오 탐지율 ≥80%', () => {
      let detected = 0;

      for (const scenario of attackScenarios) {
        const context = createContext({
          targetDomain: scenario.targetDomain,
          currentDomain: 'shop.example.com',
          timeSinceInput: scenario.timeSinceInput,
          requestType: scenario.requestType ?? NetworkRequestType.FETCH,
          fieldType: SensitiveFieldType.CARD_NUMBER
        });

        const result = engine.analyze(context);

        if (result.verdict === Verdict.DANGEROUS) {
          detected++;
        }
      }

      const detectionRate = (detected / attackScenarios.length) * 100;

      expect(detectionRate).toBeGreaterThanOrEqual(80);
    });

    const safeScenarios = [
      { name: 'Stripe', targetDomain: 'api.stripe.com' },
      { name: 'PayPal', targetDomain: 'www.paypal.com' },
      { name: '토스페이먼츠', targetDomain: 'api.tosspayments.com' },
      { name: '이니시스', targetDomain: 'inilite.inicis.com' },
      { name: '동일 도메인', targetDomain: 'api.shop.example.com' },
      { name: '서브도메인', targetDomain: 'checkout.shop.example.com' },
      { name: '분석 (비민감)', targetDomain: 'www.google-analytics.com' }
    ];

    it('정상 시나리오 오탐율 ≤20%', () => {
      let falsePositives = 0;

      for (const scenario of safeScenarios) {
        const context = createContext({
          targetDomain: scenario.targetDomain,
          currentDomain: 'shop.example.com',
          timeSinceInput: 5000, // 충분히 오래된 입력
          fieldType:
            scenario.name === '분석 (비민감)'
              ? SensitiveFieldType.EMAIL
              : SensitiveFieldType.CARD_NUMBER
        });

        const result = engine.analyze(context);

        if (result.verdict === Verdict.DANGEROUS) {
          falsePositives++;
        }
      }

      const falsePositiveRate = (falsePositives / safeScenarios.length) * 100;

      expect(falsePositiveRate).toBeLessThanOrEqual(20);
    });
  });
});
