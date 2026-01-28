/**
 * RuleRegistry 테스트
 */

import {
  createDetectionRule,
  DetectionRule,
  RuleCategory,
  RuleCheckResult
} from '@domain/entities/DetectionRule';
import {
  createRuleRegistry,
  RuleRegistry
} from '@domain/rules/RuleRegistry';

/**
 * 테스트용 규칙 생성 헬퍼
 */
function createTestRule(
  id: string,
  category: RuleCategory,
  priority: number,
  enabled = true
): DetectionRule {
  return createDetectionRule({
    id,
    name: `test_rule_${id}`,
    description: `테스트 규칙 ${id}`,
    category,
    priority,
    enabled,
    check: (): RuleCheckResult => ({ match: false, confidence: 0 })
  });
}

describe('RuleRegistry', () => {
  let registry: RuleRegistry;

  beforeEach(() => {
    registry = createRuleRegistry();
  });

  describe('createRuleRegistry', () => {
    it('새로운 규칙 레지스트리를 생성해야 한다', () => {
      expect(registry).toBeDefined();
      expect(typeof registry.register).toBe('function');
      expect(typeof registry.getAll).toBe('function');
    });

    it('초기 상태에서 내장 규칙이 등록되어 있어야 한다', () => {
      const rules = registry.getAll();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('내장 위험 규칙이 등록되어 있어야 한다', () => {
      const dangerRules = registry.getByCategory(RuleCategory.DANGER);
      expect(dangerRules.length).toBe(5); // D001-D005
    });

    it('내장 안전 규칙이 등록되어 있어야 한다', () => {
      const safeRules = registry.getByCategory(RuleCategory.SAFE);
      expect(safeRules.length).toBe(3); // S001-S003
    });
  });

  describe('register', () => {
    it('새 규칙을 등록할 수 있어야 한다', () => {
      const customRule = createTestRule('C001', RuleCategory.DANGER, 50);
      const initialCount = registry.getAll().length;

      registry.register(customRule);

      expect(registry.getAll().length).toBe(initialCount + 1);
      expect(registry.get('C001')).toBeDefined();
    });

    it('동일 ID 규칙을 등록하면 덮어쓰기해야 한다', () => {
      const rule1 = createTestRule('C001', RuleCategory.DANGER, 50);
      const rule2 = createTestRule('C001', RuleCategory.SAFE, 60);

      registry.register(rule1);
      registry.register(rule2);

      const registered = registry.get('C001');
      expect(registered?.category).toBe(RuleCategory.SAFE);
      expect(registered?.priority).toBe(60);
    });
  });

  describe('unregister', () => {
    it('규칙을 등록 해제할 수 있어야 한다', () => {
      const customRule = createTestRule('C001', RuleCategory.DANGER, 50);
      registry.register(customRule);

      const result = registry.unregister('C001');

      expect(result).toBe(true);
      expect(registry.get('C001')).toBeUndefined();
    });

    it('존재하지 않는 규칙 등록 해제 시 false를 반환해야 한다', () => {
      const result = registry.unregister('NONEXISTENT');
      expect(result).toBe(false);
    });

    it('내장 규칙도 등록 해제할 수 있어야 한다', () => {
      const initialCount = registry.getAll().length;

      registry.unregister('D001');

      expect(registry.getAll().length).toBe(initialCount - 1);
      expect(registry.get('D001')).toBeUndefined();
    });
  });

  describe('get', () => {
    it('ID로 규칙을 조회할 수 있어야 한다', () => {
      const rule = registry.get('D001');

      expect(rule).toBeDefined();
      expect(rule?.id).toBe('D001');
    });

    it('존재하지 않는 ID는 undefined를 반환해야 한다', () => {
      const rule = registry.get('NONEXISTENT');
      expect(rule).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('등록된 모든 규칙을 반환해야 한다', () => {
      const rules = registry.getAll();
      expect(rules.length).toBe(8); // 5 danger + 3 safe
    });

    it('불변 배열을 반환해야 한다', () => {
      const rules = registry.getAll();
      expect(Object.isFrozen(rules)).toBe(true);
    });
  });

  describe('getByCategory', () => {
    it('DANGER 카테고리 규칙만 반환해야 한다', () => {
      const rules = registry.getByCategory(RuleCategory.DANGER);

      expect(rules.length).toBe(5);
      rules.forEach((rule) => {
        expect(rule.category).toBe(RuleCategory.DANGER);
      });
    });

    it('SAFE 카테고리 규칙만 반환해야 한다', () => {
      const rules = registry.getByCategory(RuleCategory.SAFE);

      expect(rules.length).toBe(3);
      rules.forEach((rule) => {
        expect(rule.category).toBe(RuleCategory.SAFE);
      });
    });
  });

  describe('enable / disable', () => {
    it('규칙을 비활성화할 수 있어야 한다', () => {
      const result = registry.disable('D001');

      expect(result).toBe(true);
      expect(registry.get('D001')?.enabled).toBe(false);
    });

    it('규칙을 활성화할 수 있어야 한다', () => {
      registry.disable('D001');
      const result = registry.enable('D001');

      expect(result).toBe(true);
      expect(registry.get('D001')?.enabled).toBe(true);
    });

    it('존재하지 않는 규칙 비활성화 시 false를 반환해야 한다', () => {
      const result = registry.disable('NONEXISTENT');
      expect(result).toBe(false);
    });

    it('존재하지 않는 규칙 활성화 시 false를 반환해야 한다', () => {
      const result = registry.enable('NONEXISTENT');
      expect(result).toBe(false);
    });
  });

  describe('getEnabled', () => {
    it('활성화된 규칙만 반환해야 한다', () => {
      registry.disable('D001');
      registry.disable('S001');

      const enabledRules = registry.getEnabled();

      expect(enabledRules.length).toBe(6); // 8 - 2
      expect(enabledRules.find((r) => r.id === 'D001')).toBeUndefined();
      expect(enabledRules.find((r) => r.id === 'S001')).toBeUndefined();
    });
  });

  describe('getSortedByPriority', () => {
    it('우선순위 내림차순으로 정렬해야 한다', () => {
      const rules = registry.getSortedByPriority();

      for (let i = 0; i < rules.length - 1; i++) {
        const currentRule = rules[i];
        const nextRule = rules[i + 1];
        if (currentRule !== undefined && nextRule !== undefined) {
          expect(currentRule.priority).toBeGreaterThanOrEqual(nextRule.priority);
        }
      }
    });
  });

  describe('clear', () => {
    it('모든 규칙을 제거해야 한다', () => {
      registry.clear();
      expect(registry.getAll().length).toBe(0);
    });
  });

  describe('reset', () => {
    it('내장 규칙만 유지하고 초기화해야 한다', () => {
      // 커스텀 규칙 추가
      registry.register(createTestRule('C001', RuleCategory.DANGER, 50));
      registry.disable('D001');

      registry.reset();

      // 커스텀 규칙 제거됨
      expect(registry.get('C001')).toBeUndefined();
      // 내장 규칙 복원됨
      expect(registry.get('D001')?.enabled).toBe(true);
      expect(registry.getAll().length).toBe(8);
    });
  });
});
