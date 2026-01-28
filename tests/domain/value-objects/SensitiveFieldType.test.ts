/**
 * SensitiveFieldType 값 객체 테스트
 */

import {
  SensitiveFieldType,
  isCardRelatedField,
  isHighSensitivityField,
  SENSITIVE_FIELD_PATTERNS,
  inferFieldTypeFromPattern,
  inferFieldTypeFromAutocomplete
} from '@domain/value-objects/SensitiveFieldType';

describe('SensitiveFieldType', () => {
  describe('enum values', () => {
    it('모든 민감 필드 타입이 정의되어 있어야 한다', () => {
      expect(SensitiveFieldType.CARD_NUMBER).toBe('card_number');
      expect(SensitiveFieldType.CVV).toBe('cvv');
      expect(SensitiveFieldType.EXPIRY_DATE).toBe('expiry_date');
      expect(SensitiveFieldType.PASSWORD).toBe('password');
      expect(SensitiveFieldType.EMAIL).toBe('email');
      expect(SensitiveFieldType.PHONE).toBe('phone');
      expect(SensitiveFieldType.SSN).toBe('ssn');
      expect(SensitiveFieldType.UNKNOWN).toBe('unknown');
    });
  });

  describe('isCardRelatedField', () => {
    it('카드 관련 필드를 올바르게 식별해야 한다', () => {
      expect(isCardRelatedField(SensitiveFieldType.CARD_NUMBER)).toBe(true);
      expect(isCardRelatedField(SensitiveFieldType.CVV)).toBe(true);
      expect(isCardRelatedField(SensitiveFieldType.EXPIRY_DATE)).toBe(true);
    });

    it('카드와 무관한 필드는 false를 반환해야 한다', () => {
      expect(isCardRelatedField(SensitiveFieldType.PASSWORD)).toBe(false);
      expect(isCardRelatedField(SensitiveFieldType.EMAIL)).toBe(false);
      expect(isCardRelatedField(SensitiveFieldType.PHONE)).toBe(false);
      expect(isCardRelatedField(SensitiveFieldType.SSN)).toBe(false);
      expect(isCardRelatedField(SensitiveFieldType.UNKNOWN)).toBe(false);
    });
  });

  describe('isHighSensitivityField', () => {
    it('고민감도 필드를 올바르게 식별해야 한다', () => {
      expect(isHighSensitivityField(SensitiveFieldType.CARD_NUMBER)).toBe(true);
      expect(isHighSensitivityField(SensitiveFieldType.CVV)).toBe(true);
      expect(isHighSensitivityField(SensitiveFieldType.PASSWORD)).toBe(true);
      expect(isHighSensitivityField(SensitiveFieldType.SSN)).toBe(true);
    });

    it('저민감도 필드는 false를 반환해야 한다', () => {
      expect(isHighSensitivityField(SensitiveFieldType.EMAIL)).toBe(false);
      expect(isHighSensitivityField(SensitiveFieldType.PHONE)).toBe(false);
      expect(isHighSensitivityField(SensitiveFieldType.UNKNOWN)).toBe(false);
    });
  });

  describe('SENSITIVE_FIELD_PATTERNS', () => {
    it('type 패턴이 정의되어 있어야 한다', () => {
      expect(SENSITIVE_FIELD_PATTERNS.type).toContain('password');
      expect(SENSITIVE_FIELD_PATTERNS.type).toContain('tel');
      expect(SENSITIVE_FIELD_PATTERNS.type).toContain('number');
    });

    it('name 패턴이 RegExp 배열로 정의되어 있어야 한다', () => {
      expect(Array.isArray(SENSITIVE_FIELD_PATTERNS.name)).toBe(true);
      expect(SENSITIVE_FIELD_PATTERNS.name.length).toBeGreaterThan(0);
      expect(SENSITIVE_FIELD_PATTERNS.name[0]).toBeInstanceOf(RegExp);
    });

    it('autocomplete 패턴이 정의되어 있어야 한다', () => {
      expect(SENSITIVE_FIELD_PATTERNS.autocomplete).toContain('cc-number');
      expect(SENSITIVE_FIELD_PATTERNS.autocomplete).toContain('cc-csc');
      expect(SENSITIVE_FIELD_PATTERNS.autocomplete).toContain('current-password');
    });

    it('name 패턴이 카드 관련 필드를 매칭해야 한다', () => {
      const cardPatterns = SENSITIVE_FIELD_PATTERNS.name;
      expect(cardPatterns.some((p) => p.test('card-number'))).toBe(true);
      expect(cardPatterns.some((p) => p.test('credit_card'))).toBe(true);
      expect(cardPatterns.some((p) => p.test('cvv'))).toBe(true);
      expect(cardPatterns.some((p) => p.test('cvc'))).toBe(true);
    });
  });

  describe('inferFieldTypeFromPattern', () => {
    it('CVV 패턴을 인식해야 한다', () => {
      expect(inferFieldTypeFromPattern('cvv')).toBe(SensitiveFieldType.CVV);
      expect(inferFieldTypeFromPattern('cvc')).toBe(SensitiveFieldType.CVV);
      expect(inferFieldTypeFromPattern('csc')).toBe(SensitiveFieldType.CVV);
    });

    it('카드 번호 패턴을 인식해야 한다', () => {
      expect(inferFieldTypeFromPattern('card-number')).toBe(
        SensitiveFieldType.CARD_NUMBER
      );
      expect(inferFieldTypeFromPattern('credit_card')).toBe(
        SensitiveFieldType.CARD_NUMBER
      );
      expect(inferFieldTypeFromPattern('ccnum')).toBe(
        SensitiveFieldType.CARD_NUMBER
      );
    });

    it('만료일 패턴을 인식해야 한다', () => {
      expect(inferFieldTypeFromPattern('expiry')).toBe(
        SensitiveFieldType.EXPIRY_DATE
      );
      expect(inferFieldTypeFromPattern('valid-date')).toBe(
        SensitiveFieldType.EXPIRY_DATE
      );
    });

    it('비밀번호 패턴을 인식해야 한다', () => {
      expect(inferFieldTypeFromPattern('password')).toBe(
        SensitiveFieldType.PASSWORD
      );
      expect(inferFieldTypeFromPattern('pwd')).toBe(
        SensitiveFieldType.PASSWORD
      );
      expect(inferFieldTypeFromPattern('passwd')).toBe(
        SensitiveFieldType.PASSWORD
      );
    });

    it('SSN 패턴을 인식해야 한다', () => {
      expect(inferFieldTypeFromPattern('ssn')).toBe(SensitiveFieldType.SSN);
      expect(inferFieldTypeFromPattern('social-security')).toBe(
        SensitiveFieldType.SSN
      );
    });

    it('이메일 패턴을 인식해야 한다', () => {
      expect(inferFieldTypeFromPattern('email')).toBe(SensitiveFieldType.EMAIL);
      expect(inferFieldTypeFromPattern('user-email')).toBe(
        SensitiveFieldType.EMAIL
      );
    });

    it('전화번호 패턴을 인식해야 한다', () => {
      expect(inferFieldTypeFromPattern('phone')).toBe(SensitiveFieldType.PHONE);
      expect(inferFieldTypeFromPattern('tel')).toBe(SensitiveFieldType.PHONE);
    });

    it('인식 못하면 UNKNOWN을 반환해야 한다', () => {
      expect(inferFieldTypeFromPattern('username')).toBe(
        SensitiveFieldType.UNKNOWN
      );
      expect(inferFieldTypeFromPattern('address')).toBe(
        SensitiveFieldType.UNKNOWN
      );
    });
  });

  describe('inferFieldTypeFromAutocomplete', () => {
    it('cc-number는 CARD_NUMBER를 반환해야 한다', () => {
      expect(inferFieldTypeFromAutocomplete('cc-number')).toBe(
        SensitiveFieldType.CARD_NUMBER
      );
    });

    it('cc-csc는 CVV를 반환해야 한다', () => {
      expect(inferFieldTypeFromAutocomplete('cc-csc')).toBe(
        SensitiveFieldType.CVV
      );
    });

    it('cc-exp 관련은 EXPIRY_DATE를 반환해야 한다', () => {
      expect(inferFieldTypeFromAutocomplete('cc-exp')).toBe(
        SensitiveFieldType.EXPIRY_DATE
      );
      expect(inferFieldTypeFromAutocomplete('cc-exp-month')).toBe(
        SensitiveFieldType.EXPIRY_DATE
      );
      expect(inferFieldTypeFromAutocomplete('cc-exp-year')).toBe(
        SensitiveFieldType.EXPIRY_DATE
      );
    });

    it('password 관련은 PASSWORD를 반환해야 한다', () => {
      expect(inferFieldTypeFromAutocomplete('current-password')).toBe(
        SensitiveFieldType.PASSWORD
      );
      expect(inferFieldTypeFromAutocomplete('new-password')).toBe(
        SensitiveFieldType.PASSWORD
      );
    });

    it('알 수 없는 값은 UNKNOWN을 반환해야 한다', () => {
      expect(inferFieldTypeFromAutocomplete('name')).toBe(
        SensitiveFieldType.UNKNOWN
      );
      expect(inferFieldTypeFromAutocomplete('address')).toBe(
        SensitiveFieldType.UNKNOWN
      );
    });
  });
});
