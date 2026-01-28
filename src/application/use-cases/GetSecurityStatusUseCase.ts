/**
 * ============================================================================
 * 파일: GetSecurityStatusUseCase.ts
 * ============================================================================
 *
 * [역할]
 * 현재 도메인의 보안 상태를 조회하는 유즈케이스입니다.
 * 팝업에서 "신호등" 색상과 통계를 표시하기 위해 사용됩니다.
 *
 * [비유]
 * "건강 검진 결과표"와 같습니다:
 * - 전체 상태: 양호/주의/위험
 * - 세부 항목: 위험 이벤트 수, 의심 이벤트 수 등
 *
 * [출력: SecurityStatusDTO]
 * - overallStatus: 전체 상태 ('safe' | 'warning' | 'danger')
 * - currentDomain: 현재 도메인
 * - isWhitelisted: 화이트리스트 여부
 * - recentDangerCount: 최근 위험 이벤트 수
 * - recentSuspiciousCount: 최근 의심 이벤트 수
 * - totalEventCount: 전체 이벤트 수
 * - lastAnalysisTime: 마지막 분석 시간
 * - aiEnabled: AI 분석 활성화 여부
 *
 * [상태 결정 로직]
 * - DANGER 이벤트 1개 이상 → 'danger' (빨간색)
 * - SUSPICIOUS 또는 UNKNOWN 이벤트 있음 → 'warning' (노란색)
 * - 그 외 → 'safe' (초록색)
 *
 * [특징]
 * - 현재 도메인 기준으로 필터링하여 조회
 * - 다른 도메인의 이벤트는 카운트에 포함되지 않음
 *
 * [의존성]
 * - IEventRepository: 이벤트 저장소
 * - ISettingsRepository: 설정 저장소
 *
 * [다른 파일과의 관계]
 * - popup.ts: GET_STATUS 메시지로 이 유즈케이스 호출
 * - TrafficLight.ts: 반환된 상태로 신호등 색상 표시
 * - MessageHandler.ts: GET_STATUS 메시지 처리
 *
 * [흐름]
 * 팝업 열림 → GET_STATUS 메시지 → MessageHandler
 * → GetSecurityStatusUseCase.execute(currentDomain)
 * → SecurityStatusDTO 반환 → 팝업 UI 업데이트
 * ============================================================================
 */

import { SecurityStatusDTO } from '@application/dto/AnalysisDTO';
import { IEventRepository } from '@domain/ports/IEventRepository';
import { ISettingsRepository } from '@domain/ports/ISettingsRepository';
import { Verdict } from '@domain/value-objects/Verdict';

/**
 * 유즈케이스 의존성
 */
export interface GetSecurityStatusUseCaseDeps {
  eventRepository: IEventRepository;
  settingsRepository: ISettingsRepository;
}

/**
 * GetSecurityStatusUseCase 클래스
 */
export class GetSecurityStatusUseCase {
  private readonly eventRepository: IEventRepository;
  private readonly settingsRepository: ISettingsRepository;

  constructor(deps: GetSecurityStatusUseCaseDeps) {
    this.eventRepository = deps.eventRepository;
    this.settingsRepository = deps.settingsRepository;
  }

  /**
   * 보안 상태 조회 실행
   */
  async execute(currentDomain: string): Promise<SecurityStatusDTO> {
    // 병렬로 데이터 조회
    const [isWhitelisted, aiEnabled, totalEventCount, recentEvents] =
      await Promise.all([
        this.settingsRepository.isWhitelisted(currentDomain),
        this.settingsRepository.get('aiAnalysisEnabled'),
        this.eventRepository.count(),
        // 현재 도메인의 이벤트만 조회
        this.eventRepository.findByFilter({
          domain: currentDomain,
          limit: 100
        })
      ]);

    // 이벤트별 카운트 계산
    const recentDangerCount = recentEvents.filter(
      (e) => e.verdict === Verdict.DANGEROUS
    ).length;
    const recentSuspiciousCount = recentEvents.filter(
      (e) => e.verdict === Verdict.SUSPICIOUS
    ).length;
    const recentUnknownCount = recentEvents.filter(
      (e) => e.verdict === Verdict.UNKNOWN
    ).length;

    // 전체 상태 결정
    const overallStatus = this.determineOverallStatus(
      recentDangerCount,
      recentSuspiciousCount,
      recentUnknownCount
    );

    // 결과 생성
    const result: SecurityStatusDTO = {
      overallStatus,
      currentDomain,
      isWhitelisted,
      recentDangerCount,
      recentSuspiciousCount,
      totalEventCount,
      aiEnabled: Boolean(aiEnabled)
    };

    // 마지막 분석 시간 (이벤트가 있을 때만 포함)
    const firstEvent = recentEvents[0];
    if (firstEvent !== undefined) {
      result.lastAnalysisTime = firstEvent.timestamp;
    }

    return result;
  }

  /**
   * 전체 상태 결정
   */
  private determineOverallStatus(
    dangerCount: number,
    suspiciousCount: number,
    unknownCount: number
  ): 'safe' | 'warning' | 'danger' {
    if (dangerCount > 0) {
      return 'danger';
    }
    if (suspiciousCount > 0 || unknownCount > 0) {
      return 'warning';
    }
    return 'safe';
  }
}
