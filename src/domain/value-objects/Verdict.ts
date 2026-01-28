/**
 * ============================================================================
 * 파일: Verdict.ts
 * ============================================================================
 *
 * [역할]
 * 네트워크 요청을 분석한 후의 "판정 결과"와 "권장 조치"를 정의합니다.
 * 이 확장 프로그램의 핵심 결과물입니다.
 *
 * [비유]
 * 병원 진단서와 같습니다:
 * - Verdict(판정): "정상", "의심", "위험" 같은 진단 결과
 * - Recommendation(권장 조치): "경과 관찰", "주의", "치료 필요" 같은 권고사항
 *
 * [주요 기능]
 * 1. Verdict 열거형: SAFE(안전), SUSPICIOUS(의심), DANGEROUS(위험), UNKNOWN(미확인)
 * 2. Recommendation 열거형: PROCEED(진행), WARN(경고), BLOCK(차단)
 * 3. getVerdictSeverity(): 판정의 심각도 수준 반환 (0~3)
 * 4. getMoreSevereVerdict(): 두 판정 중 더 심각한 것 반환
 * 5. getVerdictLabel(): 한국어 레이블 반환 ("안전", "위험" 등)
 *
 * [다른 파일과의 관계]
 * - DetectionEvent.ts: 탐지 이벤트에 판정 결과 포함
 * - HeuristicEngine.ts: 휴리스틱 분석 후 Verdict 반환
 * - IAIAnalyzer.ts: AI 분석 후 Verdict 반환
 * - IconManager.ts: Verdict에 따라 아이콘 색상 변경
 * - WarningModal.ts: Verdict에 따라 경고창 표시
 *
 * [흐름]
 * 네트워크 요청 감지 → 휴리스틱/AI 분석 → Verdict 결정
 * → Recommendation 결정 → 아이콘 색상 변경 + 경고창 표시
 * ============================================================================
 */

/**
 * 판정 결과 열거형
 */
export enum Verdict {
  SAFE = 'safe',
  SUSPICIOUS = 'suspicious',
  DANGEROUS = 'dangerous',
  UNKNOWN = 'unknown'
}

/**
 * 권장 조치 열거형
 */
export enum Recommendation {
  PROCEED = 'proceed',
  WARN = 'warn',
  BLOCK = 'block'
}

/**
 * 액션이 필요한 판정인지 확인
 */
export function isActionRequired(verdict: Verdict): boolean {
  return verdict !== Verdict.SAFE;
}

/**
 * 판정에 따른 기본 권장 조치 반환
 */
export function getRecommendationForVerdict(verdict: Verdict): Recommendation {
  switch (verdict) {
    case Verdict.SAFE:
      return Recommendation.PROCEED;
    case Verdict.DANGEROUS:
      return Recommendation.BLOCK;
    case Verdict.SUSPICIOUS:
    case Verdict.UNKNOWN:
    default:
      return Recommendation.WARN;
  }
}

/**
 * 판정의 심각도 수준 반환 (0-3)
 */
export function getVerdictSeverity(verdict: Verdict): number {
  switch (verdict) {
    case Verdict.DANGEROUS:
      return 3;
    case Verdict.SUSPICIOUS:
      return 2;
    case Verdict.UNKNOWN:
      return 1;
    case Verdict.SAFE:
    default:
      return 0;
  }
}

/**
 * 판정 결과 비교 (더 심각한 쪽 반환)
 */
export function getMoreSevereVerdict(a: Verdict, b: Verdict): Verdict {
  return getVerdictSeverity(a) >= getVerdictSeverity(b) ? a : b;
}

/**
 * 판정 결과의 한국어 레이블 반환
 */
export function getVerdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case Verdict.SAFE:
      return '안전';
    case Verdict.SUSPICIOUS:
      return '의심';
    case Verdict.DANGEROUS:
      return '위험';
    case Verdict.UNKNOWN:
    default:
      return '알 수 없음';
  }
}

/**
 * 권장 조치의 한국어 레이블 반환
 */
export function getRecommendationLabel(recommendation: Recommendation): string {
  switch (recommendation) {
    case Recommendation.PROCEED:
      return '진행';
    case Recommendation.WARN:
      return '주의';
    case Recommendation.BLOCK:
      return '차단';
  }
}
