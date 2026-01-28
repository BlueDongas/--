/**
 * ============================================================================
 * 파일: DetectionRule.ts
 * ============================================================================
 *
 * [역할]
 * 폼재킹 공격을 탐지하기 위한 "규칙"의 구조를 정의합니다.
 * 각 규칙은 특정 패턴을 검사하고, 매칭 여부와 신뢰도를 반환합니다.
 *
 * [비유]
 * 보안 검색대의 "검사 매뉴얼"과 같습니다:
 * - 각 매뉴얼(규칙)에는 무엇을 검사할지(check 함수)
 * - 얼마나 중요한지(priority), 어떤 종류인지(category) 정의
 *
 * [규칙의 구성요소]
 * - id: 규칙 고유 ID (예: "D001", "S001")
 * - name: 규칙 이름 (예: "immediate_external_transfer")
 * - description: 규칙 설명
 * - category: DANGER(위험) 또는 SAFE(안전)
 * - priority: 우선순위 (0~100, 높을수록 먼저 검사)
 * - enabled: 활성화 여부
 * - check(): 실제 검사를 수행하는 함수
 *
 * [주요 함수]
 * - createDetectionRule(): 새 규칙 생성 (유효성 검사 포함)
 * - sortRulesByPriority(): 우선순위 순으로 정렬
 * - filterEnabledRules(): 활성화된 규칙만 필터링
 * - filterRulesByCategory(): 카테고리별 필터링
 *
 * [다른 파일과의 관계]
 * - DangerRules.ts: 위험 규칙들 정의 (D001~D005)
 * - SafeRules.ts: 안전 규칙들 정의 (S001~S003)
 * - HeuristicEngine.ts: 규칙들을 실행하여 탐지 수행
 * - RuleRegistry.ts: 모든 규칙을 등록하고 관리
 *
 * [흐름]
 * DangerRules/SafeRules에서 규칙 정의 → RuleRegistry에 등록
 * → HeuristicEngine이 analyze() 시 각 규칙의 check() 실행
 * → 매칭 결과에 따라 Verdict 결정
 * ============================================================================
 */

/**
 * 규칙 카테고리 열거형
 */
export enum RuleCategory {
  DANGER = 'danger',
  SAFE = 'safe'
}

/**
 * 규칙 검사 결과 인터페이스
 */
export interface RuleCheckResult {
  match: boolean;
  confidence: number;
  details?: Record<string, unknown>;
}

/**
 * 규칙 검사 컨텍스트 (제네릭)
 */
export type RuleCheckContext = unknown;

/**
 * 규칙 검사 함수 타입
 */
export type RuleCheckFunction = (context: RuleCheckContext) => RuleCheckResult;

/**
 * DetectionRule 생성 Props
 */
export interface DetectionRuleProps {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  priority: number;
  enabled: boolean;
  check: RuleCheckFunction;
  tags?: string[];
}

/**
 * DetectionRule 엔티티 인터페이스
 */
export interface DetectionRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: RuleCategory;
  readonly priority: number;
  readonly enabled: boolean;
  readonly tags: readonly string[];
  check(context: RuleCheckContext): RuleCheckResult;
  enable(): DetectionRule;
  disable(): DetectionRule;
}

/**
 * DetectionRule 생성 함수
 */
export function createDetectionRule(props: DetectionRuleProps): DetectionRule {
  // 유효성 검사
  if (props.id.trim() === '') {
    throw new Error('id는 비어있을 수 없습니다');
  }

  if (props.name.trim() === '') {
    throw new Error('name은 비어있을 수 없습니다');
  }

  if (props.priority < 0 || props.priority > 100) {
    throw new Error('priority는 0과 100 사이여야 합니다');
  }

  // tags 불변 배열 생성
  const frozenTags = Object.freeze([...(props.tags ?? [])]);

  // check 함수 래핑 (원본 함수 호출)
  const checkFunction = props.check;

  // enable 메서드
  const enable = (): DetectionRule => {
    return createDetectionRule({
      ...props,
      enabled: true
    });
  };

  // disable 메서드
  const disable = (): DetectionRule => {
    return createDetectionRule({
      ...props,
      enabled: false
    });
  };

  // 불변 객체 생성
  const detectionRule: DetectionRule = Object.freeze({
    id: props.id,
    name: props.name,
    description: props.description,
    category: props.category,
    priority: props.priority,
    enabled: props.enabled,
    tags: frozenTags,
    check: checkFunction,
    enable,
    disable
  });

  return detectionRule;
}

/**
 * 규칙을 우선순위로 정렬 (높은 순)
 */
export function sortRulesByPriority(
  rules: readonly DetectionRule[]
): DetectionRule[] {
  return [...rules].sort((a, b) => b.priority - a.priority);
}

/**
 * 활성화된 규칙만 필터링
 */
export function filterEnabledRules(
  rules: readonly DetectionRule[]
): DetectionRule[] {
  return rules.filter((rule) => rule.enabled);
}

/**
 * 특정 카테고리의 규칙만 필터링
 */
export function filterRulesByCategory(
  rules: readonly DetectionRule[],
  category: RuleCategory
): DetectionRule[] {
  return rules.filter((rule) => rule.category === category);
}

/**
 * 특정 태그를 가진 규칙 필터링
 */
export function filterRulesByTag(
  rules: readonly DetectionRule[],
  tag: string
): DetectionRule[] {
  return rules.filter((rule) => rule.tags.includes(tag));
}
