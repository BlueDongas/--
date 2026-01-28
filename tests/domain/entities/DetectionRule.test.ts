/**
 * DetectionRule 엔티티 테스트
 */

import {
  RuleCategory,
  RuleCheckResult,
  createDetectionRule,
  sortRulesByPriority,
  filterEnabledRules,
  filterRulesByCategory,
  filterRulesByTag,
  DetectionRuleProps
} from '@domain/entities/DetectionRule';

describe('RuleCategory', () => {
  it('모든 규칙 카테고리가 정의되어 있어야 한다', () => {
    expect(RuleCategory.DANGER).toBe('danger');
    expect(RuleCategory.SAFE).toBe('safe');
  });
});

describe('DetectionRule', () => {
  const mockCheckFunction = jest.fn(
    (): RuleCheckResult => ({
      match: true,
      confidence: 0.9,
      details: { test: 'value' }
    })
  );

  const validProps: DetectionRuleProps = {
    id: 'D001',
    name: 'immediate_external_transfer',
    description: '민감 정보 입력 후 500ms 이내 외부 도메인으로 전송',
    category: RuleCategory.DANGER,
    priority: 100,
    enabled: true,
    check: mockCheckFunction,
    tags: ['timing', 'external', 'critical']
  };

  beforeEach(() => {
    mockCheckFunction.mockClear();
  });

  describe('createDetectionRule', () => {
    it('유효한 props로 DetectionRule을 생성해야 한다', () => {
      const rule = createDetectionRule(validProps);

      expect(rule.id).toBe(validProps.id);
      expect(rule.name).toBe(validProps.name);
      expect(rule.description).toBe(validProps.description);
      expect(rule.category).toBe(validProps.category);
      expect(rule.priority).toBe(validProps.priority);
      expect(rule.enabled).toBe(validProps.enabled);
    });

    it('빈 id로 생성 시 에러가 발생해야 한다', () => {
      expect(() => createDetectionRule({ ...validProps, id: '' })).toThrow(
        'id는 비어있을 수 없습니다'
      );
    });

    it('빈 name으로 생성 시 에러가 발생해야 한다', () => {
      expect(() => createDetectionRule({ ...validProps, name: '' })).toThrow(
        'name은 비어있을 수 없습니다'
      );
    });

    it('priority가 0 미만이면 에러가 발생해야 한다', () => {
      expect(() =>
        createDetectionRule({ ...validProps, priority: -1 })
      ).toThrow('priority는 0과 100 사이여야 합니다');
    });

    it('priority가 100 초과면 에러가 발생해야 한다', () => {
      expect(() =>
        createDetectionRule({ ...validProps, priority: 101 })
      ).toThrow('priority는 0과 100 사이여야 합니다');
    });

    it('tags가 없으면 빈 배열로 초기화되어야 한다', () => {
      const propsWithoutTags: DetectionRuleProps = {
        id: validProps.id,
        name: validProps.name,
        description: validProps.description,
        category: validProps.category,
        priority: validProps.priority,
        enabled: validProps.enabled,
        check: validProps.check
      };
      const rule = createDetectionRule(propsWithoutTags);
      expect(rule.tags).toEqual([]);
    });
  });

  describe('check function', () => {
    it('check 함수가 올바르게 호출되어야 한다', () => {
      const rule = createDetectionRule(validProps);
      const mockData = { test: 'data' };

      const result = rule.check(mockData as never);

      expect(mockCheckFunction).toHaveBeenCalledWith(mockData);
      expect(result.match).toBe(true);
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('enable/disable', () => {
    it('규칙을 비활성화할 수 있어야 한다', () => {
      const rule = createDetectionRule(validProps);
      const disabledRule = rule.disable();

      expect(disabledRule.enabled).toBe(false);
      expect(rule.enabled).toBe(true); // 원본은 변경되지 않음
    });

    it('규칙을 활성화할 수 있어야 한다', () => {
      const disabledRule = createDetectionRule({
        ...validProps,
        enabled: false
      });
      const enabledRule = disabledRule.enable();

      expect(enabledRule.enabled).toBe(true);
      expect(disabledRule.enabled).toBe(false); // 원본은 변경되지 않음
    });
  });

  describe('불변성', () => {
    it('DetectionRule은 불변이어야 한다', () => {
      const rule = createDetectionRule(validProps);

      expect(() => {
        (rule as { id: string }).id = 'hacked';
      }).toThrow();
    });

    it('tags는 불변이어야 한다', () => {
      const rule = createDetectionRule(validProps);

      expect(() => {
        (rule.tags as string[]).push('hacked');
      }).toThrow();
    });
  });

  describe('sortRulesByPriority', () => {
    it('우선순위 높은 순으로 정렬해야 한다', () => {
      const rules = [
        createDetectionRule({ ...validProps, id: 'low', priority: 10 }),
        createDetectionRule({ ...validProps, id: 'high', priority: 100 }),
        createDetectionRule({ ...validProps, id: 'medium', priority: 50 })
      ];

      const sorted = sortRulesByPriority(rules);
      expect(sorted[0]?.id).toBe('high');
      expect(sorted[1]?.id).toBe('medium');
      expect(sorted[2]?.id).toBe('low');
    });

    it('원본 배열을 변경하지 않아야 한다', () => {
      const rules = [
        createDetectionRule({ ...validProps, id: 'low', priority: 10 }),
        createDetectionRule({ ...validProps, id: 'high', priority: 100 })
      ];

      const originalFirst = rules[0];
      sortRulesByPriority(rules);
      expect(rules[0]).toBe(originalFirst);
    });
  });

  describe('filterEnabledRules', () => {
    it('활성화된 규칙만 반환해야 한다', () => {
      const rules = [
        createDetectionRule({ ...validProps, id: 'enabled1', enabled: true }),
        createDetectionRule({ ...validProps, id: 'disabled', enabled: false }),
        createDetectionRule({ ...validProps, id: 'enabled2', enabled: true })
      ];

      const enabled = filterEnabledRules(rules);
      expect(enabled).toHaveLength(2);
      expect(enabled.every((r) => r.enabled)).toBe(true);
    });
  });

  describe('filterRulesByCategory', () => {
    it('특정 카테고리 규칙만 반환해야 한다', () => {
      const rules = [
        createDetectionRule({
          ...validProps,
          id: 'danger1',
          category: RuleCategory.DANGER
        }),
        createDetectionRule({
          ...validProps,
          id: 'safe1',
          category: RuleCategory.SAFE
        }),
        createDetectionRule({
          ...validProps,
          id: 'danger2',
          category: RuleCategory.DANGER
        })
      ];

      const dangerRules = filterRulesByCategory(rules, RuleCategory.DANGER);
      expect(dangerRules).toHaveLength(2);
      expect(dangerRules.every((r) => r.category === RuleCategory.DANGER)).toBe(
        true
      );
    });
  });

  describe('filterRulesByTag', () => {
    it('특정 태그를 가진 규칙만 반환해야 한다', () => {
      const rules = [
        createDetectionRule({
          ...validProps,
          id: 'rule1',
          tags: ['timing', 'critical']
        }),
        createDetectionRule({
          ...validProps,
          id: 'rule2',
          tags: ['network']
        }),
        createDetectionRule({
          ...validProps,
          id: 'rule3',
          tags: ['timing', 'low-priority']
        })
      ];

      const timingRules = filterRulesByTag(rules, 'timing');
      expect(timingRules).toHaveLength(2);
    });

    it('태그가 없는 경우 빈 배열을 반환해야 한다', () => {
      const rules = [
        createDetectionRule({ ...validProps, id: 'rule1', tags: ['other'] })
      ];

      const result = filterRulesByTag(rules, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });
});
