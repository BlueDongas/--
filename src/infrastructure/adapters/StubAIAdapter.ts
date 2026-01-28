/**
 * ============================================================================
 * 파일: StubAIAdapter.ts
 * ============================================================================
 *
 * [역할]
 * IAIAnalyzer 인터페이스의 "더미(Stub)" 구현체입니다.
 * 실제 AI 분석 없이 휴리스틱 결과를 그대로 반환합니다.
 *
 * [비유]
 * "AI 전문가가 출장 중일 때의 대리인"과 같습니다:
 * - 실제 AI 분석은 못 하지만
 * - 휴리스틱 결과를 기반으로 응답
 *
 * [왜 Stub이 필요한가?]
 * 1. Chrome 확장 프로그램에서 AWS Bedrock SDK 미지원
 * 2. 네트워크 문제로 AI 서버 접속 불가 시
 * 3. 개발/테스트 환경에서 AI 비용 절감
 *
 * [동작 방식]
 * - isAvailable(): 항상 false 반환 (AI 사용 불가)
 * - analyze(): 휴리스틱 결과를 그대로 반환
 *   - heuristicVerdict가 있으면 그 값 사용
 *   - 없으면 UNKNOWN + 기본 메시지
 *
 * [Stub 패턴]
 * 테스트나 대체 구현을 위해 인터페이스만 맞추는 빈 구현
 * - 실제 동작은 하지 않지만
 * - 인터페이스 규격은 지킴
 * - 시스템이 정상 동작할 수 있게 함
 *
 * [다른 파일과의 관계]
 * - IAIAnalyzer.ts: 구현하는 인터페이스
 * - BedrockAIAdapter.ts: 실제 AI 구현 (현재 미사용)
 * - Container.ts: 현재 이 Stub을 주입
 * - DetectionOrchestrator.ts: isAvailable() false이면 AI 분석 스킵
 *
 * [현재 상태]
 * Container.ts에서 StubAIAdapter를 기본으로 사용
 * → 모든 분석은 휴리스틱만으로 수행됨
 * ============================================================================
 */

import {
  AIAnalysisRequest,
  AIAnalysisResponse,
  IAIAnalyzer
} from '@domain/ports/IAIAnalyzer';
import { Recommendation, Verdict } from '@domain/value-objects/Verdict';

/**
 * Stub AI 어댑터 구현체
 * 휴리스틱 분석 결과를 그대로 반환하거나 기본값을 반환
 */
export class StubAIAdapter implements IAIAnalyzer {
  private enabled: boolean = false;

  /**
   * AI 분석기 활성화 여부
   * 스텁 구현은 항상 비활성화 상태
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * AI 분석기 활성화/비활성화
   * 스텁에서는 실제 효과 없음
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * AI 분석 가능 여부 확인
   * 스텁 구현은 항상 false
   */
  isAvailable(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * AI 분석 실행
   * 휴리스틱 결과를 기반으로 응답 생성
   */
  analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    // 휴리스틱 결과가 있으면 그것을 기반으로 응답
    if (request.heuristicVerdict !== undefined) {
      return Promise.resolve({
        verdict: request.heuristicVerdict,
        confidence: request.heuristicConfidence ?? 0.5,
        reason: 'AI 분석 불가 - 휴리스틱 결과 사용',
        recommendation: this.getRecommendation(request.heuristicVerdict)
      });
    }

    // 기본 응답
    return Promise.resolve({
      verdict: Verdict.UNKNOWN,
      confidence: 0,
      reason: 'AI 분석 서비스를 사용할 수 없습니다. 휴리스틱 분석 결과만 사용됩니다.',
      recommendation: Recommendation.WARN
    });
  }

  /**
   * Verdict에 따른 권장 조치 반환
   */
  private getRecommendation(verdict: Verdict): Recommendation {
    switch (verdict) {
      case Verdict.DANGEROUS:
        return Recommendation.BLOCK;
      case Verdict.SUSPICIOUS:
        return Recommendation.WARN;
      case Verdict.SAFE:
        return Recommendation.PROCEED;
      default:
        return Recommendation.WARN;
    }
  }
}
