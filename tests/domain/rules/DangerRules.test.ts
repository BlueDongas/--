/**
 * 위험 규칙 (Danger Rules) D001-D005 테스트
 */

import {
  DetectionRule,
  RuleCategory
} from '@domain/entities/DetectionRule';
import {
  createNetworkRequest,
  NetworkRequestType
} from '@domain/entities/NetworkRequest';
import { createSensitiveInput } from '@domain/entities/SensitiveInput';
import { DetectionContext } from '@domain/ports/IDetectionEngine';
import {
  createD001Rule,
  createD002Rule,
  createD003Rule,
  createD004Rule,
  createD005Rule
} from '@domain/rules/DangerRules';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';

/**
 * 테스트용 컨텍스트 생성 헬퍼
 */
function createTestContext(overrides: {
  domain?: string;
  currentDomain?: string;
  timestamp?: number;
  recentInputTimestamp?: number;
  requestType?: NetworkRequestType;
  fieldType?: SensitiveFieldType;
  payloadSize?: number;
  externalScripts?: string[];
}): DetectionContext {
  const now = Date.now();
  const config = {
    domain: 'api.example.com',
    currentDomain: 'shop.example.com',
    timestamp: now,
    recentInputTimestamp: now - 200,
    requestType: NetworkRequestType.FETCH,
    fieldType: SensitiveFieldType.CARD_NUMBER,
    payloadSize: 256,
    externalScripts: [] as string[],
    ...overrides
  };

  return {
    request: createNetworkRequest({
      type: config.requestType,
      url: `https://${config.domain}/api/data`,
      method: 'POST',
      payloadSize: config.payloadSize,
      timestamp: config.timestamp
    }),
    recentInputs: [
      createSensitiveInput({
        fieldId: 'test-field',
        fieldType: config.fieldType,
        inputLength: 16,
        timestamp: config.recentInputTimestamp,
        domPath: 'form > input'
      })
    ],
    currentDomain: config.currentDomain,
    externalScripts: config.externalScripts
  };
}

describe('D001: Immediate External Transfer', () => {
  let rule: DetectionRule;

  beforeEach(() => {
    rule = createD001Rule();
  });

  it('규칙이 올바른 속성을 가져야 한다', () => {
    expect(rule.id).toBe('D001');
    expect(rule.name).toBe('immediate_external_transfer');
    expect(rule.category).toBe(RuleCategory.DANGER);
    expect(rule.priority).toBe(100);
    expect(rule.enabled).toBe(true);
  });

  it('민감 입력 후 200ms 이내 외부 전송 시 매칭되어야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external-malicious.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 200,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.details?.timeDiff).toBe(200);
  });

  it('100ms 이내 전송 시 더 높은 신뢰도를 반환해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external-malicious.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 50,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.98);
  });

  it('500ms 이상 경과 후 전송은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 600, // 600ms 전
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('동일 도메인으로 전송 시 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'shop.example.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 100,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('서브도메인으로 전송 시 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'api.shop.example.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 100,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('민감 입력이 없으면 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context: DetectionContext = {
      request: createNetworkRequest({
        type: NetworkRequestType.FETCH,
        url: 'https://external.com/api',
        method: 'POST',
        payloadSize: 256,
        timestamp: now
      }),
      recentInputs: [],
      currentDomain: 'shop.example.com'
    };

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('CVV 입력 후 외부 전송도 매칭되어야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 200,
      fieldType: SensitiveFieldType.CVV
    });

    const result = rule.check(context);
    expect(result.match).toBe(true);
  });

  it('비밀번호 입력 후 외부 전송도 매칭되어야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 200,
      fieldType: SensitiveFieldType.PASSWORD
    });

    const result = rule.check(context);
    expect(result.match).toBe(true);
  });
});

describe('D002: Known Malicious Domain', () => {
  let rule: DetectionRule;

  beforeEach(() => {
    rule = createD002Rule();
  });

  it('규칙이 올바른 속성을 가져야 한다', () => {
    expect(rule.id).toBe('D002');
    expect(rule.name).toBe('known_malicious_domain');
    expect(rule.category).toBe(RuleCategory.DANGER);
    expect(rule.priority).toBe(99);
    expect(rule.enabled).toBe(true);
  });

  it('알려진 스키머 도메인으로 전송 시 매칭되어야 한다', () => {
    const context = createTestContext({
      domain: 'analytics-track.info'
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    expect(result.details?.patternType).toBe('skimmer');
  });

  it('타이포스쿼팅 도메인 감지해야 한다 (g00gle)', () => {
    const context = createTestContext({
      domain: 'g00gle-analytics.com'
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.98);
    expect(result.details?.patternType).toBe('typosquat');
  });

  it('타이포스쿼팅 도메인 감지해야 한다 (stripe-api)', () => {
    const context = createTestContext({
      domain: 'stripe-api.net'
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.details?.patternType).toBe('typosquat');
  });

  it('의심스러운 TLD 도메인 감지해야 한다', () => {
    const context = createTestContext({
      domain: 'abc.tk'
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.details?.patternType).toBe('suspicious_tld');
  });

  it('정상 도메인은 매칭되지 않아야 한다', () => {
    const context = createTestContext({
      domain: 'api.stripe.com'
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('정상 분석 서비스는 매칭되지 않아야 한다', () => {
    const context = createTestContext({
      domain: 'google-analytics.com'
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });
});

describe('D003: Suspicious CDN Pattern', () => {
  let rule: DetectionRule;

  beforeEach(() => {
    rule = createD003Rule();
  });

  it('규칙이 올바른 속성을 가져야 한다', () => {
    expect(rule.id).toBe('D003');
    expect(rule.name).toBe('suspicious_cdn_pattern');
    expect(rule.category).toBe(RuleCategory.DANGER);
    expect(rule.priority).toBe(95);
    expect(rule.enabled).toBe(true);
  });

  it('가짜 CDN 도메인을 감지해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'cdn1.malware.info',
      timestamp: now,
      recentInputTimestamp: now - 1000 // 1초 이내
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(0.85);
    expect(result.details?.patternType).toBe('fake_cdn');
  });

  it('가짜 분석 서비스 도메인을 감지해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'analytics1.collect.net',
      timestamp: now,
      recentInputTimestamp: now - 2000
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.details?.patternType).toBe('fake_analytics');
  });

  it('5초 이상 지난 입력이면 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'cdn1.malware.info',
      timestamp: now,
      recentInputTimestamp: now - 6000 // 6초 전
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('정상 CDN (cloudflare)은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'cdn.cloudflare.com',
      timestamp: now,
      recentInputTimestamp: now - 1000
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('정상 CDN (jsdelivr)은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'cdn.jsdelivr.net',
      timestamp: now,
      recentInputTimestamp: now - 1000
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });
});

describe('D004: Card Data to Analytics', () => {
  let rule: DetectionRule;

  beforeEach(() => {
    rule = createD004Rule();
  });

  it('규칙이 올바른 속성을 가져야 한다', () => {
    expect(rule.id).toBe('D004');
    expect(rule.name).toBe('card_data_to_analytics');
    expect(rule.category).toBe(RuleCategory.DANGER);
    expect(rule.priority).toBe(94);
    expect(rule.enabled).toBe(true);
  });

  it('카드 입력 후 Google Analytics로 전송 시 매칭되어야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'google-analytics.com',
      timestamp: now,
      recentInputTimestamp: now - 500,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(result.details?.analyticsService).toBe('google-analytics.com');
  });

  it('카드 입력 후 Mixpanel로 전송 시 매칭되어야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'api.mixpanel.com',
      timestamp: now,
      recentInputTimestamp: now - 500,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(true);
  });

  it('CVV 입력 후 분석 서비스로 전송 시 매칭되어야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'api.hotjar.com',
      timestamp: now,
      recentInputTimestamp: now - 500,
      fieldType: SensitiveFieldType.CVV
    });

    const result = rule.check(context);
    expect(result.match).toBe(true);
  });

  it('1초 이상 경과한 입력은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'google-analytics.com',
      timestamp: now,
      recentInputTimestamp: now - 1500,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('분석 서비스가 아닌 도메인은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'api.example.com',
      timestamp: now,
      recentInputTimestamp: now - 500,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('이메일 입력만 있으면 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'google-analytics.com',
      timestamp: now,
      recentInputTimestamp: now - 500,
      fieldType: SensitiveFieldType.EMAIL
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });
});

describe('D005: Beacon with Sensitive', () => {
  let rule: DetectionRule;

  beforeEach(() => {
    rule = createD005Rule();
  });

  it('규칙이 올바른 속성을 가져야 한다', () => {
    expect(rule.id).toBe('D005');
    expect(rule.name).toBe('beacon_with_sensitive');
    expect(rule.category).toBe(RuleCategory.DANGER);
    expect(rule.priority).toBe(93);
    expect(rule.enabled).toBe(true);
  });

  it('Beacon으로 외부 도메인에 민감 정보 전송 시 매칭되어야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 1000,
      requestType: NetworkRequestType.BEACON,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('카드 데이터 포함 시 더 높은 신뢰도를 반환해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 1000,
      requestType: NetworkRequestType.BEACON,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.92);
  });

  it('비밀번호만 있으면 낮은 신뢰도를 반환해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 1000,
      requestType: NetworkRequestType.BEACON,
      fieldType: SensitiveFieldType.PASSWORD
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(0.85);
  });

  it('Beacon이 아닌 요청은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 1000,
      requestType: NetworkRequestType.FETCH,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('동일 도메인으로 Beacon 전송은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'shop.example.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 1000,
      requestType: NetworkRequestType.BEACON,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('3초 이상 경과한 입력은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com',
      timestamp: now,
      recentInputTimestamp: now - 4000,
      requestType: NetworkRequestType.BEACON,
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('민감 입력이 없으면 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context: DetectionContext = {
      request: createNetworkRequest({
        type: NetworkRequestType.BEACON,
        url: 'https://external.com/api',
        method: 'POST',
        payloadSize: 256,
        timestamp: now
      }),
      recentInputs: [],
      currentDomain: 'shop.example.com'
    };

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });
});
