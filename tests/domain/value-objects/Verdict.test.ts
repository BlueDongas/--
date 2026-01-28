/**
 * Verdict 값 객체 테스트
 */

import {
  Verdict,
  Recommendation,
  isActionRequired,
  getRecommendationForVerdict,
  getVerdictSeverity,
  getMoreSevereVerdict,
  getVerdictLabel,
  getRecommendationLabel
} from '@domain/value-objects/Verdict';

describe('Verdict', () => {
  describe('enum values', () => {
    it('모든 판정 결과가 정의되어 있어야 한다', () => {
      expect(Verdict.SAFE).toBe('safe');
      expect(Verdict.SUSPICIOUS).toBe('suspicious');
      expect(Verdict.DANGEROUS).toBe('dangerous');
      expect(Verdict.UNKNOWN).toBe('unknown');
    });
  });

  describe('isActionRequired', () => {
    it('DANGEROUS일 때 액션이 필요하다', () => {
      expect(isActionRequired(Verdict.DANGEROUS)).toBe(true);
    });

    it('SUSPICIOUS일 때 액션이 필요하다', () => {
      expect(isActionRequired(Verdict.SUSPICIOUS)).toBe(true);
    });

    it('SAFE일 때 액션이 필요하지 않다', () => {
      expect(isActionRequired(Verdict.SAFE)).toBe(false);
    });

    it('UNKNOWN일 때 액션이 필요하다', () => {
      expect(isActionRequired(Verdict.UNKNOWN)).toBe(true);
    });
  });

  describe('getVerdictSeverity', () => {
    it('DANGEROUS가 가장 높은 심각도를 가진다', () => {
      expect(getVerdictSeverity(Verdict.DANGEROUS)).toBe(3);
    });

    it('SUSPICIOUS가 중간 심각도를 가진다', () => {
      expect(getVerdictSeverity(Verdict.SUSPICIOUS)).toBe(2);
    });

    it('UNKNOWN이 낮은 심각도를 가진다', () => {
      expect(getVerdictSeverity(Verdict.UNKNOWN)).toBe(1);
    });

    it('SAFE가 가장 낮은 심각도를 가진다', () => {
      expect(getVerdictSeverity(Verdict.SAFE)).toBe(0);
    });
  });

  describe('getMoreSevereVerdict', () => {
    it('DANGEROUS vs SAFE는 DANGEROUS를 반환한다', () => {
      expect(getMoreSevereVerdict(Verdict.DANGEROUS, Verdict.SAFE)).toBe(
        Verdict.DANGEROUS
      );
    });

    it('SAFE vs DANGEROUS는 DANGEROUS를 반환한다', () => {
      expect(getMoreSevereVerdict(Verdict.SAFE, Verdict.DANGEROUS)).toBe(
        Verdict.DANGEROUS
      );
    });

    it('같은 심각도일 때 첫 번째를 반환한다', () => {
      expect(getMoreSevereVerdict(Verdict.SAFE, Verdict.SAFE)).toBe(
        Verdict.SAFE
      );
    });

    it('SUSPICIOUS vs UNKNOWN은 SUSPICIOUS를 반환한다', () => {
      expect(getMoreSevereVerdict(Verdict.SUSPICIOUS, Verdict.UNKNOWN)).toBe(
        Verdict.SUSPICIOUS
      );
    });
  });

  describe('getVerdictLabel', () => {
    it('SAFE는 "안전"을 반환한다', () => {
      expect(getVerdictLabel(Verdict.SAFE)).toBe('안전');
    });

    it('SUSPICIOUS는 "의심"을 반환한다', () => {
      expect(getVerdictLabel(Verdict.SUSPICIOUS)).toBe('의심');
    });

    it('DANGEROUS는 "위험"을 반환한다', () => {
      expect(getVerdictLabel(Verdict.DANGEROUS)).toBe('위험');
    });

    it('UNKNOWN은 "알 수 없음"을 반환한다', () => {
      expect(getVerdictLabel(Verdict.UNKNOWN)).toBe('알 수 없음');
    });
  });
});

describe('Recommendation', () => {
  describe('enum values', () => {
    it('모든 권장 조치가 정의되어 있어야 한다', () => {
      expect(Recommendation.PROCEED).toBe('proceed');
      expect(Recommendation.WARN).toBe('warn');
      expect(Recommendation.BLOCK).toBe('block');
    });
  });

  describe('getRecommendationForVerdict', () => {
    it('SAFE일 때 PROCEED를 권장한다', () => {
      expect(getRecommendationForVerdict(Verdict.SAFE)).toBe(
        Recommendation.PROCEED
      );
    });

    it('SUSPICIOUS일 때 WARN을 권장한다', () => {
      expect(getRecommendationForVerdict(Verdict.SUSPICIOUS)).toBe(
        Recommendation.WARN
      );
    });

    it('DANGEROUS일 때 BLOCK을 권장한다', () => {
      expect(getRecommendationForVerdict(Verdict.DANGEROUS)).toBe(
        Recommendation.BLOCK
      );
    });

    it('UNKNOWN일 때 WARN을 권장한다', () => {
      expect(getRecommendationForVerdict(Verdict.UNKNOWN)).toBe(
        Recommendation.WARN
      );
    });
  });

  describe('getRecommendationLabel', () => {
    it('PROCEED는 "진행"을 반환한다', () => {
      expect(getRecommendationLabel(Recommendation.PROCEED)).toBe('진행');
    });

    it('WARN은 "주의"를 반환한다', () => {
      expect(getRecommendationLabel(Recommendation.WARN)).toBe('주의');
    });

    it('BLOCK은 "차단"을 반환한다', () => {
      expect(getRecommendationLabel(Recommendation.BLOCK)).toBe('차단');
    });
  });
});
