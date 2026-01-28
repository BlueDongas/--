/**
 * SensitiveInput 엔티티 테스트
 */

import {
  createSensitiveInput,
  isRecentInput,
  findMostRecentInput,
  filterRecentInputs,
  SensitiveInputProps
} from '@domain/entities/SensitiveInput';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';

describe('SensitiveInput', () => {
  const validProps: SensitiveInputProps = {
    fieldId: 'card-number-field',
    fieldType: SensitiveFieldType.CARD_NUMBER,
    inputLength: 16,
    timestamp: Date.now(),
    domPath: 'form > div > input#card-number'
  };

  describe('createSensitiveInput', () => {
    it('유효한 props로 SensitiveInput을 생성해야 한다', () => {
      const input = createSensitiveInput(validProps);

      expect(input.fieldId).toBe(validProps.fieldId);
      expect(input.fieldType).toBe(validProps.fieldType);
      expect(input.inputLength).toBe(validProps.inputLength);
      expect(input.timestamp).toBe(validProps.timestamp);
      expect(input.domPath).toBe(validProps.domPath);
    });

    it('id가 자동 생성되어야 한다', () => {
      const input = createSensitiveInput(validProps);
      expect(input.id).toBeDefined();
      expect(typeof input.id).toBe('string');
      expect(input.id.length).toBeGreaterThan(0);
    });

    it('빈 fieldId로 생성 시 에러가 발생해야 한다', () => {
      expect(() =>
        createSensitiveInput({ ...validProps, fieldId: '' })
      ).toThrow('fieldId는 비어있을 수 없습니다');
    });

    it('음수 inputLength로 생성 시 에러가 발생해야 한다', () => {
      expect(() =>
        createSensitiveInput({ ...validProps, inputLength: -1 })
      ).toThrow('inputLength는 0 이상이어야 합니다');
    });

    it('미래 timestamp로 생성 시 에러가 발생해야 한다', () => {
      const futureTimestamp = Date.now() + 1000000;
      expect(() =>
        createSensitiveInput({ ...validProps, timestamp: futureTimestamp })
      ).toThrow('timestamp는 미래 시간일 수 없습니다');
    });
  });

  describe('isRecentInput', () => {
    it('500ms 이내의 입력은 최근 입력으로 판단해야 한다', () => {
      const recentInput = createSensitiveInput({
        ...validProps,
        timestamp: Date.now() - 200
      });

      expect(isRecentInput(recentInput, 500)).toBe(true);
    });

    it('500ms 이상 지난 입력은 최근 입력이 아니다', () => {
      const oldInput = createSensitiveInput({
        ...validProps,
        timestamp: Date.now() - 1000
      });

      expect(isRecentInput(oldInput, 500)).toBe(false);
    });

    it('정확히 임계값 시간의 입력은 최근 입력이 아니다', () => {
      const exactInput = createSensitiveInput({
        ...validProps,
        timestamp: Date.now() - 500
      });

      expect(isRecentInput(exactInput, 500)).toBe(false);
    });

    it('기본 임계값(500ms)이 적용되어야 한다', () => {
      const recentInput = createSensitiveInput({
        ...validProps,
        timestamp: Date.now() - 100
      });

      expect(isRecentInput(recentInput)).toBe(true);
    });
  });

  describe('불변성', () => {
    it('SensitiveInput은 불변이어야 한다', () => {
      const input = createSensitiveInput(validProps);

      expect(() => {
        (input as { fieldId: string }).fieldId = 'hacked';
      }).toThrow();
    });
  });

  describe('findMostRecentInput', () => {
    it('빈 배열에서는 undefined를 반환해야 한다', () => {
      expect(findMostRecentInput([])).toBeUndefined();
    });

    it('가장 최근 입력을 찾아야 한다', () => {
      const now = Date.now();
      const inputs = [
        createSensitiveInput({ ...validProps, timestamp: now - 1000 }),
        createSensitiveInput({ ...validProps, timestamp: now - 500 }),
        createSensitiveInput({ ...validProps, timestamp: now - 200 })
      ];

      const mostRecent = findMostRecentInput(inputs);
      expect(mostRecent).toBeDefined();
      expect(mostRecent?.timestamp).toBe(now - 200);
    });

    it('단일 입력도 올바르게 처리해야 한다', () => {
      const input = createSensitiveInput(validProps);
      expect(findMostRecentInput([input])).toBe(input);
    });

    it('첫 번째 입력이 가장 최근일 때도 올바르게 처리해야 한다', () => {
      const now = Date.now();
      const inputs = [
        createSensitiveInput({ ...validProps, timestamp: now - 100 }),
        createSensitiveInput({ ...validProps, timestamp: now - 500 }),
        createSensitiveInput({ ...validProps, timestamp: now - 1000 })
      ];

      const mostRecent = findMostRecentInput(inputs);
      expect(mostRecent).toBeDefined();
      expect(mostRecent?.timestamp).toBe(now - 100);
    });
  });

  describe('filterRecentInputs', () => {
    it('지정된 시간 이내의 입력만 필터링해야 한다', () => {
      const now = Date.now();
      const inputs = [
        createSensitiveInput({ ...validProps, timestamp: now - 1000 }),
        createSensitiveInput({ ...validProps, timestamp: now - 500 }),
        createSensitiveInput({ ...validProps, timestamp: now - 200 })
      ];

      const recent = filterRecentInputs(inputs, 600);
      expect(recent).toHaveLength(2);
    });

    it('빈 배열을 반환할 수 있어야 한다', () => {
      const now = Date.now();
      const inputs = [
        createSensitiveInput({ ...validProps, timestamp: now - 10000 })
      ];

      const recent = filterRecentInputs(inputs, 500);
      expect(recent).toHaveLength(0);
    });
  });
});
