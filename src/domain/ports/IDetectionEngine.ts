/**
 * ============================================================================
 * 파일: IDetectionEngine.ts (포트/인터페이스)
 * ============================================================================
 *
 * [역할]
 * 휴리스틱 탐지 엔진의 "인터페이스"를 정의합니다.
 * 실제 구현은 domain/services/HeuristicEngine.ts에 있습니다.
 *
 * [비유]
 * "보안 검색대 운영 매뉴얼"과 같습니다:
 * - 어떤 정보(DetectionContext)를 검사하고
 * - 어떤 결과(DetectionResult)를 반환할지 정의
 *
 * [DetectionContext - 탐지에 필요한 정보]
 * - request: 분석할 네트워크 요청
 * - recentInputs: 최근 민감 입력 목록
 * - currentDomain: 현재 페이지 도메인
 * - externalScripts: 외부 스크립트 목록 (옵션)
 *
 * [DetectionResult - 탐지 결과]
 * - verdict: 판정 (SAFE, DANGEROUS, UNKNOWN 등)
 * - confidence: 신뢰도 (0~1)
 * - matchedRules: 매칭된 규칙 목록
 * - reason: 판정 이유
 *
 * [MatchedRule - 매칭된 규칙 정보]
 * - ruleId: 규칙 ID (예: "D001")
 * - ruleName: 규칙 이름
 * - checkResult: 규칙 검사 결과 (매칭 여부, 신뢰도, 상세 정보)
 *
 * [주요 메서드]
 * - analyze(): 탐지 수행
 * - registerRule(): 규칙 등록
 * - unregisterRule(): 규칙 해제
 * - getRules(): 등록된 규칙 조회
 * - setRuleEnabled(): 규칙 활성화/비활성화
 *
 * [다른 파일과의 관계]
 * - HeuristicEngine.ts: 실제 휴리스틱 엔진 구현
 * - DetectionOrchestrator.ts: 엔진을 사용하여 분석 수행
 * - DangerRules.ts, SafeRules.ts: 엔진에 등록되는 규칙들
 *
 * [흐름]
 * DetectionOrchestrator → analyze(context) 호출
 * → HeuristicEngine이 규칙들 실행 → DetectionResult 반환
 * ============================================================================
 */

import { DetectionRule, RuleCheckResult } from '@domain/entities/DetectionRule';
import { NetworkRequest } from '@domain/entities/NetworkRequest';
import { SensitiveInput } from '@domain/entities/SensitiveInput';
import { Verdict } from '@domain/value-objects/Verdict';

/**
 * 탐지 컨텍스트
 */
export interface DetectionContext {
  request: NetworkRequest;
  recentInputs: readonly SensitiveInput[];
  currentDomain: string;
  externalScripts?: readonly string[];
}

/**
 * 탐지 결과
 */
export interface DetectionResult {
  verdict: Verdict;
  confidence: number;
  matchedRules: readonly MatchedRule[];
  reason: string;
}

/**
 * 매칭된 규칙 정보
 */
export interface MatchedRule {
  ruleId: string;
  ruleName: string;
  checkResult: RuleCheckResult;
}

/**
 * 탐지 엔진 인터페이스
 */
export interface IDetectionEngine {
  /**
   * 네트워크 요청을 분석하여 탐지 수행
   */
  analyze(context: DetectionContext): DetectionResult;

  /**
   * 규칙 등록
   */
  registerRule(rule: DetectionRule): void;

  /**
   * 규칙 등록 해제
   */
  unregisterRule(ruleId: string): void;

  /**
   * 등록된 모든 규칙 조회
   */
  getRules(): readonly DetectionRule[];

  /**
   * 특정 규칙 활성화/비활성화
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void;
}
