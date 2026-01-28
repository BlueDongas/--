/**
 * DetectionEvent 엔티티 테스트
 */

import {
  createDetectionEvent,
  isDangerousEvent,
  findMostSevereEvent,
  DetectionEventProps
} from '@domain/entities/DetectionEvent';
import { NetworkRequestType } from '@domain/entities/NetworkRequest';
import { Verdict, Recommendation } from '@domain/value-objects/Verdict';

describe('DetectionEvent', () => {
  const validProps: DetectionEventProps = {
    verdict: Verdict.DANGEROUS,
    confidence: 0.95,
    reason: '민감 정보 입력 후 500ms 이내 외부 도메인으로 전송',
    recommendation: Recommendation.BLOCK,
    matchedRuleId: 'D001',
    requestId: 'req-12345',
    requestType: NetworkRequestType.FETCH,
    targetDomain: 'malicious.com',
    currentDomain: 'shop.example.com',
    timestamp: Date.now()
  };

  describe('createDetectionEvent', () => {
    it('유효한 props로 DetectionEvent를 생성해야 한다', () => {
      const event = createDetectionEvent(validProps);

      expect(event.verdict).toBe(validProps.verdict);
      expect(event.confidence).toBe(validProps.confidence);
      expect(event.reason).toBe(validProps.reason);
      expect(event.recommendation).toBe(validProps.recommendation);
      expect(event.matchedRuleId).toBe(validProps.matchedRuleId);
    });

    it('id가 자동 생성되어야 한다', () => {
      const event = createDetectionEvent(validProps);
      expect(event.id).toBeDefined();
      expect(typeof event.id).toBe('string');
    });

    it('confidence가 0 미만이면 에러가 발생해야 한다', () => {
      expect(() =>
        createDetectionEvent({ ...validProps, confidence: -0.1 })
      ).toThrow('confidence는 0과 1 사이여야 합니다');
    });

    it('confidence가 1 초과면 에러가 발생해야 한다', () => {
      expect(() =>
        createDetectionEvent({ ...validProps, confidence: 1.1 })
      ).toThrow('confidence는 0과 1 사이여야 합니다');
    });

    it('빈 reason으로 생성 시 에러가 발생해야 한다', () => {
      expect(() =>
        createDetectionEvent({ ...validProps, reason: '' })
      ).toThrow('reason은 비어있을 수 없습니다');
    });

    it('빈 targetDomain으로 생성 시 에러가 발생해야 한다', () => {
      expect(() =>
        createDetectionEvent({ ...validProps, targetDomain: '' })
      ).toThrow('targetDomain은 비어있을 수 없습니다');
    });

    it('빈 currentDomain으로 생성 시 에러가 발생해야 한다', () => {
      expect(() =>
        createDetectionEvent({ ...validProps, currentDomain: '' })
      ).toThrow('currentDomain은 비어있을 수 없습니다');
    });

    it('matchedRuleId가 없어도 생성 가능해야 한다 (AI 분석 결과)', () => {
      const propsWithoutRule: DetectionEventProps = {
        verdict: validProps.verdict,
        confidence: validProps.confidence,
        reason: validProps.reason,
        recommendation: validProps.recommendation,
        requestId: validProps.requestId,
        requestType: validProps.requestType,
        targetDomain: validProps.targetDomain,
        currentDomain: validProps.currentDomain,
        timestamp: validProps.timestamp
      };
      const event = createDetectionEvent(propsWithoutRule);
      expect(event.matchedRuleId).toBeUndefined();
    });
  });

  describe('불변성', () => {
    it('DetectionEvent는 불변이어야 한다', () => {
      const event = createDetectionEvent(validProps);

      expect(() => {
        (event as { verdict: Verdict }).verdict = Verdict.SAFE;
      }).toThrow();
    });
  });

  describe('직렬화', () => {
    it('toJSON으로 직렬화 가능해야 한다', () => {
      const event = createDetectionEvent(validProps);
      const json = event.toJSON();

      expect(json.verdict).toBe(validProps.verdict);
      expect(json.confidence).toBe(validProps.confidence);
      expect(typeof json.id).toBe('string');
    });
  });

  describe('isDangerousEvent', () => {
    it('DANGEROUS 판정은 true를 반환해야 한다', () => {
      const event = createDetectionEvent(validProps);
      expect(isDangerousEvent(event)).toBe(true);
    });

    it('SAFE 판정은 false를 반환해야 한다', () => {
      const event = createDetectionEvent({
        ...validProps,
        verdict: Verdict.SAFE,
        recommendation: Recommendation.PROCEED
      });
      expect(isDangerousEvent(event)).toBe(false);
    });

    it('SUSPICIOUS 판정은 false를 반환해야 한다', () => {
      const event = createDetectionEvent({
        ...validProps,
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN
      });
      expect(isDangerousEvent(event)).toBe(false);
    });
  });

  describe('findMostSevereEvent', () => {
    it('빈 배열에서는 undefined를 반환해야 한다', () => {
      expect(findMostSevereEvent([])).toBeUndefined();
    });

    it('가장 심각한 이벤트를 반환해야 한다', () => {
      const events = [
        createDetectionEvent({
          ...validProps,
          verdict: Verdict.SAFE,
          recommendation: Recommendation.PROCEED
        }),
        createDetectionEvent({
          ...validProps,
          verdict: Verdict.DANGEROUS,
          recommendation: Recommendation.BLOCK
        }),
        createDetectionEvent({
          ...validProps,
          verdict: Verdict.SUSPICIOUS,
          recommendation: Recommendation.WARN
        })
      ];

      const mostSevere = findMostSevereEvent(events);
      expect(mostSevere).toBeDefined();
      expect(mostSevere?.verdict).toBe(Verdict.DANGEROUS);
    });

    it('단일 이벤트도 올바르게 처리해야 한다', () => {
      const event = createDetectionEvent(validProps);
      expect(findMostSevereEvent([event])).toBe(event);
    });
  });
});
