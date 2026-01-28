/**
 * ============================================================================
 * 파일: HeuristicEngine.ts
 * ============================================================================
 *
 * [역할]
 * 휴리스틱 규칙 기반으로 네트워크 요청을 분석하는 "탐지 엔진"입니다.
 * AI 분석 전에 먼저 실행되어 명확한 패턴을 빠르게 판별합니다.
 *
 * [비유]
 * "1차 보안 검색대"와 같습니다:
 * - 규칙(매뉴얼)에 따라 빠르게 검사
 * - 명확히 위험하거나 안전한 것은 바로 판정
 * - 애매한 것만 2차(AI 분석)로 넘김
 *
 * [분석 로직 (analyze 함수)]
 * 1. 위험 규칙(D001~D005) 먼저 실행
 *    → 하나라도 매칭되면 DANGEROUS 반환
 * 2. 안전 규칙(S001~S003) 실행
 *    → 하나라도 매칭되면 SAFE 반환
 * 3. 아무것도 매칭 안 되면 UNKNOWN 반환
 *    → AI 분석 필요
 *
 * [주요 함수]
 * - analyze(): 탐지 분석 수행 (핵심 함수)
 * - registerRule(): 규칙 등록
 * - getDangerRules(): 위험 규칙 조회
 * - getSafeRules(): 안전 규칙 조회
 * - setRuleEnabled(): 규칙 활성화/비활성화
 *
 * [내부 함수]
 * - executeRules(): 규칙 목록을 우선순위 순으로 실행
 * - getMaxConfidence(): 매칭된 규칙 중 최고 신뢰도 추출
 * - createResult(): 탐지 결과 객체 생성
 *
 * [초기화]
 * 생성 시 자동으로 DangerRules와 SafeRules 등록
 *
 * [다른 파일과의 관계]
 * - DetectionOrchestrator.ts: 이 엔진을 호출하여 1차 분석
 * - DangerRules.ts, SafeRules.ts: 실행할 규칙들
 * - IDetectionEngine.ts: 이 엔진이 구현하는 인터페이스
 *
 * [흐름]
 * 네트워크 요청 → DetectionOrchestrator
 * → HeuristicEngine.analyze(context)
 * → 규칙 실행 → DetectionResult 반환
 * → UNKNOWN이면 AI 분석 진행
 * ============================================================================
 */

import {
  DetectionRule,
  RuleCategory,
  sortRulesByPriority
} from '@domain/entities/DetectionRule';
import {
  DetectionContext,
  DetectionResult,
  IDetectionEngine,
  MatchedRule
} from '@domain/ports/IDetectionEngine';
import { createAllDangerRules } from '@domain/rules/DangerRules';
import { createAllSafeRules } from '@domain/rules/SafeRules';
import { Recommendation, Verdict } from '@domain/value-objects/Verdict';

/**
 * HeuristicEngine 타입 정의
 */
export interface HeuristicEngine extends IDetectionEngine {
  /**
   * 위험 규칙만 조회
   */
  getDangerRules(): readonly DetectionRule[];

  /**
   * 안전 규칙만 조회
   */
  getSafeRules(): readonly DetectionRule[];
}

/**
 * HeuristicEngine 생성 함수
 */
export function createHeuristicEngine(): HeuristicEngine {
  // 규칙 저장소
  const rules = new Map<string, DetectionRule>();

  /**
   * 규칙 등록
   */
  function registerRule(rule: DetectionRule): void {
    rules.set(rule.id, rule);
  }

  /**
   * 규칙 등록 해제
   */
  function unregisterRule(ruleId: string): void {
    rules.delete(ruleId);
  }

  /**
   * 모든 규칙 조회
   */
  function getRules(): readonly DetectionRule[] {
    return Array.from(rules.values());
  }

  /**
   * 위험 규칙만 조회
   */
  function getDangerRules(): readonly DetectionRule[] {
    return getRules().filter((rule) => rule.category === RuleCategory.DANGER);
  }

  /**
   * 안전 규칙만 조회
   */
  function getSafeRules(): readonly DetectionRule[] {
    return getRules().filter((rule) => rule.category === RuleCategory.SAFE);
  }

  /**
   * 규칙 활성화/비활성화
   */
  function setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = rules.get(ruleId);
    if (rule !== undefined) {
      const updatedRule = enabled ? rule.enable() : rule.disable();
      rules.set(ruleId, updatedRule);
    }
  }

  /**
   * 규칙 실행 및 결과 수집
   */
  function executeRules(
    rulesToExecute: readonly DetectionRule[],
    context: DetectionContext
  ): MatchedRule[] {
    const matchedRules: MatchedRule[] = [];

    // 우선순위 순으로 정렬
    const sortedRules = sortRulesByPriority(rulesToExecute);

    for (const rule of sortedRules) {
      // 비활성화된 규칙은 스킵
      if (!rule.enabled) {
        continue;
      }

      // 규칙 실행
      const result = rule.check(context);

      if (result.match) {
        matchedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          checkResult: result
        });
      }
    }

    return matchedRules;
  }

  /**
   * 매칭된 규칙들에서 최고 신뢰도 추출
   */
  function getMaxConfidence(matchedRules: readonly MatchedRule[]): number {
    if (matchedRules.length === 0) {
      return 0;
    }

    return Math.max(...matchedRules.map((m) => m.checkResult.confidence));
  }

  /**
   * 탐지 결과 생성
   */
  function createResult(
    verdict: Verdict,
    confidence: number,
    matchedRules: readonly MatchedRule[],
    reason: string
  ): DetectionResult {
    return {
      verdict,
      confidence,
      matchedRules,
      reason
    };
  }

  /**
   * 탐지 분석 수행
   */
  function analyze(context: DetectionContext): DetectionResult {
    // 1. 위험 규칙 먼저 실행
    const dangerRules = getDangerRules();
    const dangerMatches = executeRules(dangerRules, context);

    // 위험 규칙이 매칭되면 DANGEROUS 반환
    if (dangerMatches.length > 0) {
      const confidence = getMaxConfidence(dangerMatches);
      const primaryRule = dangerMatches[0];
      const reason =
        primaryRule !== undefined
          ? `위험 규칙 ${primaryRule.ruleId} 매칭: ${primaryRule.ruleName}`
          : '위험 규칙 매칭';

      return createResult(
        Verdict.DANGEROUS,
        confidence,
        dangerMatches,
        reason
      );
    }

    // 2. 안전 규칙 실행
    const safeRules = getSafeRules();
    const safeMatches = executeRules(safeRules, context);

    // 안전 규칙이 매칭되면 SAFE 반환
    if (safeMatches.length > 0) {
      const confidence = getMaxConfidence(safeMatches);
      const primaryRule = safeMatches[0];
      const reason =
        primaryRule !== undefined
          ? `안전 규칙 ${primaryRule.ruleId} 매칭: ${primaryRule.ruleName}`
          : '안전 규칙 매칭';

      return createResult(Verdict.SAFE, confidence, safeMatches, reason);
    }

    // 3. 아무 규칙도 매칭되지 않으면 UNKNOWN
    return createResult(
      Verdict.UNKNOWN,
      0,
      [],
      '매칭된 규칙 없음 - AI 분석 필요'
    );
  }

  // 내장 규칙 등록
  function registerBuiltInRules(): void {
    const dangerRules = createAllDangerRules();
    for (const rule of dangerRules) {
      registerRule(rule);
    }

    const safeRules = createAllSafeRules();
    for (const rule of safeRules) {
      registerRule(rule);
    }
  }

  // 초기화 시 내장 규칙 등록
  registerBuiltInRules();

  // 엔진 객체 반환
  return {
    analyze,
    registerRule,
    unregisterRule,
    getRules,
    getDangerRules,
    getSafeRules,
    setRuleEnabled
  };
}

/**
 * 분석 결과에서 권장 조치 반환
 */
export function getRecommendationFromResult(
  result: DetectionResult
): Recommendation {
  switch (result.verdict) {
    case Verdict.DANGEROUS:
      return Recommendation.BLOCK;
    case Verdict.SUSPICIOUS:
      return Recommendation.WARN;
    case Verdict.SAFE:
      return Recommendation.PROCEED;
    case Verdict.UNKNOWN:
    default:
      return Recommendation.WARN;
  }
}
