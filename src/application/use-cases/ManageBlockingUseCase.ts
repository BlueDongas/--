/**
 * ============================================================================
 * 파일: ManageBlockingUseCase.ts
 * ============================================================================
 *
 * [역할]
 * 도메인 차단 기능을 관리하는 유즈케이스입니다.
 * 경고창에서 사용자가 "허용" 또는 "차단" 버튼을 클릭했을 때 처리합니다.
 *
 * [비유]
 * "출입 관리자"와 같습니다:
 * - 허용: VIP 명단(화이트리스트)에 추가
 * - 차단: 출입금지 명단(블랙리스트)에 추가
 *
 * [사용자 액션 종류]
 * - 'allow': 허용 → 화이트리스트 추가 + 차단 해제
 * - 'block': 차단 → 블랙리스트 추가 + 화이트리스트 제거
 * - 'dismiss': 닫기 → 아무 동작 없음
 *
 * [허용(allow) 처리]
 * 1. 화이트리스트에 도메인 추가
 * 2. 이미 차단되어 있으면 차단 해제
 * → 다음부터 이 도메인은 분석 없이 SAFE 처리
 *
 * [차단(block) 처리]
 * 1. Chrome declarativeNetRequest로 차단 규칙 추가
 * 2. 화이트리스트에 있으면 제거
 * → 이 도메인으로의 모든 네트워크 요청이 차단됨
 *
 * [제공하는 기능]
 * - handleUserAction(): 사용자 액션 처리 (핵심)
 * - isBlocked(): 도메인 차단 여부 확인
 * - getBlockedDomains(): 차단 목록 조회
 * - unblockDomain(): 차단 해제
 * - clearAllBlocks(): 모든 차단 해제
 *
 * [의존성]
 * - IBlockingRepository: 차단 저장소 (DeclarativeNetRequestBlockingRepository)
 * - ISettingsRepository: 설정 저장소 (화이트리스트 관리)
 *
 * [다른 파일과의 관계]
 * - WarningModal.ts: 버튼 클릭 시 USER_ACTION 메시지 전송
 * - MessageHandler.ts: USER_ACTION 메시지 수신 시 이 유즈케이스 호출
 * - content/index.ts: 경고창 표시 및 사용자 액션 전달
 *
 * [흐름]
 * 경고창 "차단" 클릭 → USER_ACTION 메시지 (action: 'block', domain: 'evil.com')
 * → MessageHandler → ManageBlockingUseCase.handleUserAction()
 * → DeclarativeNetRequestBlockingRepository.blockDomain()
 * → Chrome이 해당 도메인 요청 자동 차단
 * ============================================================================
 */

import { IBlockingRepository } from '@domain/ports/IBlockingRepository';
import { ISettingsRepository } from '@domain/ports/ISettingsRepository';

/**
 * 사용자 액션 요청 타입
 */
export interface UserActionRequest {
  /** 사용자 액션 ('allow' | 'block' | 'dismiss') */
  action: 'allow' | 'block' | 'dismiss';
  /** 대상 도메인 */
  domain: string;
  /** 차단/허용 사유 (선택) */
  reason?: string;
}

/**
 * 사용자 액션 결과 타입
 */
export interface UserActionResult {
  /** 성공 여부 */
  success: boolean;
  /** 수행된 액션 */
  action: 'whitelisted' | 'blocked' | 'dismissed';
  /** 에러 메시지 (실패 시) */
  error?: string;
}

/**
 * 유즈케이스 의존성
 */
export interface ManageBlockingUseCaseDeps {
  blockingRepository: IBlockingRepository;
  settingsRepository: ISettingsRepository;
}

/**
 * ManageBlockingUseCase 클래스
 */
export class ManageBlockingUseCase {
  private readonly blockingRepository: IBlockingRepository;
  private readonly settingsRepository: ISettingsRepository;

  constructor(deps: ManageBlockingUseCaseDeps) {
    this.blockingRepository = deps.blockingRepository;
    this.settingsRepository = deps.settingsRepository;
  }

  /**
   * 사용자 액션 처리
   */
  async handleUserAction(request: UserActionRequest): Promise<UserActionResult> {
    try {
      switch (request.action) {
        case 'allow':
          return await this.handleAllowAction(request.domain);

        case 'block':
          return await this.handleBlockAction(request.domain, request.reason);

        case 'dismiss':
          return { success: true, action: 'dismissed' };

        default:
          return {
            success: false,
            action: 'dismissed',
            error: `Unknown action: ${String(request.action)}`
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        action: 'dismissed',
        error: errorMessage
      };
    }
  }

  /**
   * 허용 액션 처리
   * - 화이트리스트에 도메인 추가
   * - 차단되어 있으면 차단 해제
   */
  private async handleAllowAction(domain: string): Promise<UserActionResult> {
    // 화이트리스트에 추가
    await this.settingsRepository.addToWhitelist(domain);

    // 차단되어 있으면 차단 해제
    const isBlocked = await this.blockingRepository.isBlocked(domain);
    if (isBlocked) {
      await this.blockingRepository.unblockDomain(domain);
    }

    return { success: true, action: 'whitelisted' };
  }

  /**
   * 차단 액션 처리
   * - 도메인 차단
   * - 화이트리스트에 있으면 제거
   */
  private async handleBlockAction(domain: string, reason?: string): Promise<UserActionResult> {
    // 도메인 차단
    await this.blockingRepository.blockDomain(domain, reason);

    // 화이트리스트에 있으면 제거
    const isWhitelisted = await this.settingsRepository.isWhitelisted(domain);
    if (isWhitelisted) {
      await this.settingsRepository.removeFromWhitelist(domain);
    }

    return { success: true, action: 'blocked' };
  }

  /**
   * 도메인이 차단되어 있는지 확인
   */
  async isBlocked(domain: string): Promise<boolean> {
    return this.blockingRepository.isBlocked(domain);
  }

  /**
   * 차단된 도메인 목록 조회
   */
  async getBlockedDomains(): Promise<Array<{ domain: string; blockedAt: number; reason?: string }>> {
    const domains = await this.blockingRepository.getBlockedDomains();
    return domains.map((d) => {
      const result: { domain: string; blockedAt: number; reason?: string } = {
        domain: d.domain,
        blockedAt: d.blockedAt
      };
      if (d.reason !== undefined) {
        result.reason = d.reason;
      }
      return result;
    });
  }

  /**
   * 도메인 차단 해제
   */
  async unblockDomain(domain: string): Promise<void> {
    await this.blockingRepository.unblockDomain(domain);
  }

  /**
   * 모든 차단 규칙 삭제
   */
  async clearAllBlocks(): Promise<void> {
    await this.blockingRepository.clearAll();
  }
}
