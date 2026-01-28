/**
 * ============================================================================
 * 파일: RuleRegistry.ts
 * ============================================================================
 *
 * [역할]
 * 모든 탐지 규칙(Danger + Safe)을 등록하고 관리하는 "레지스트리"입니다.
 * 규칙의 CRUD(생성, 조회, 수정, 삭제)를 담당합니다.
 *
 * [비유]
 * "규칙 관리 대장"과 같습니다:
 * - 모든 규칙을 등록해두고
 * - 필요할 때 조회하거나 활성화/비활성화
 *
 * [주요 기능]
 * - register(): 새 규칙 등록
 * - unregister(): 규칙 등록 해제
 * - get(): ID로 규칙 조회
 * - getAll(): 모든 규칙 조회
 * - getByCategory(): 카테고리(DANGER/SAFE)별 조회
 * - enable()/disable(): 규칙 활성화/비활성화
 * - getEnabled(): 활성화된 규칙만 조회
 * - getSortedByPriority(): 우선순위 순 정렬
 * - reset(): 내장 규칙으로 초기화
 *
 * [초기화 시 등록되는 규칙]
 * - DangerRules: D001~D005 (위험 규칙)
 * - SafeRules: S001~S003 (안전 규칙)
 *
 * [다른 파일과의 관계]
 * - DangerRules.ts: 위험 규칙 정의
 * - SafeRules.ts: 안전 규칙 정의
 * - HeuristicEngine.ts: 규칙 실행 (이 파일 대신 직접 규칙 관리)
 *
 * [참고]
 * 현재 HeuristicEngine이 자체적으로 규칙을 관리하고 있어서
 * 이 RuleRegistry는 별도의 규칙 관리가 필요할 때 사용할 수 있습니다.
 * ============================================================================
 */

import {
  DetectionRule,
  RuleCategory,
  sortRulesByPriority
} from '@domain/entities/DetectionRule';

import { createAllDangerRules } from './DangerRules';
import { createAllSafeRules } from './SafeRules';

/**
 * RuleRegistry 인터페이스
 */
export interface RuleRegistry {
  /**
   * 규칙 등록
   */
  register(rule: DetectionRule): void;

  /**
   * 규칙 등록 해제
   */
  unregister(ruleId: string): boolean;

  /**
   * ID로 규칙 조회
   */
  get(ruleId: string): DetectionRule | undefined;

  /**
   * 모든 규칙 조회
   */
  getAll(): readonly DetectionRule[];

  /**
   * 카테고리별 규칙 조회
   */
  getByCategory(category: RuleCategory): readonly DetectionRule[];

  /**
   * 규칙 활성화
   */
  enable(ruleId: string): boolean;

  /**
   * 규칙 비활성화
   */
  disable(ruleId: string): boolean;

  /**
   * 활성화된 규칙만 조회
   */
  getEnabled(): readonly DetectionRule[];

  /**
   * 우선순위 순으로 정렬된 규칙 조회
   */
  getSortedByPriority(): readonly DetectionRule[];

  /**
   * 모든 규칙 제거
   */
  clear(): void;

  /**
   * 내장 규칙으로 초기화
   */
  reset(): void;
}

/**
 * RuleRegistry 생성 함수
 */
export function createRuleRegistry(): RuleRegistry {
  // 규칙 저장소
  const rules = new Map<string, DetectionRule>();

  /**
   * 내장 규칙 등록
   */
  function registerBuiltInRules(): void {
    // 위험 규칙 등록
    const dangerRules = createAllDangerRules();
    for (const rule of dangerRules) {
      rules.set(rule.id, rule);
    }

    // 안전 규칙 등록
    const safeRules = createAllSafeRules();
    for (const rule of safeRules) {
      rules.set(rule.id, rule);
    }
  }

  /**
   * 규칙 등록
   */
  function register(rule: DetectionRule): void {
    rules.set(rule.id, rule);
  }

  /**
   * 규칙 등록 해제
   */
  function unregister(ruleId: string): boolean {
    return rules.delete(ruleId);
  }

  /**
   * ID로 규칙 조회
   */
  function get(ruleId: string): DetectionRule | undefined {
    return rules.get(ruleId);
  }

  /**
   * 모든 규칙 조회
   */
  function getAll(): readonly DetectionRule[] {
    return Object.freeze(Array.from(rules.values()));
  }

  /**
   * 카테고리별 규칙 조회
   */
  function getByCategory(category: RuleCategory): readonly DetectionRule[] {
    return Object.freeze(
      Array.from(rules.values()).filter((rule) => rule.category === category)
    );
  }

  /**
   * 규칙 활성화
   */
  function enable(ruleId: string): boolean {
    const rule = rules.get(ruleId);
    if (rule === undefined) {
      return false;
    }
    rules.set(ruleId, rule.enable());
    return true;
  }

  /**
   * 규칙 비활성화
   */
  function disable(ruleId: string): boolean {
    const rule = rules.get(ruleId);
    if (rule === undefined) {
      return false;
    }
    rules.set(ruleId, rule.disable());
    return true;
  }

  /**
   * 활성화된 규칙만 조회
   */
  function getEnabled(): readonly DetectionRule[] {
    return Object.freeze(
      Array.from(rules.values()).filter((rule) => rule.enabled)
    );
  }

  /**
   * 우선순위 순으로 정렬된 규칙 조회
   */
  function getSortedByPriority(): readonly DetectionRule[] {
    return Object.freeze(sortRulesByPriority(Array.from(rules.values())));
  }

  /**
   * 모든 규칙 제거
   */
  function clear(): void {
    rules.clear();
  }

  /**
   * 내장 규칙으로 초기화
   */
  function reset(): void {
    rules.clear();
    registerBuiltInRules();
  }

  // 초기화
  registerBuiltInRules();

  // 레지스트리 객체 반환
  return {
    register,
    unregister,
    get,
    getAll,
    getByCategory,
    enable,
    disable,
    getEnabled,
    getSortedByPriority,
    clear,
    reset
  };
}
