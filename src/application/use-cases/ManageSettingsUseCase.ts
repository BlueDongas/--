/**
 * ============================================================================
 * 파일: ManageSettingsUseCase.ts
 * ============================================================================
 *
 * [역할]
 * 확장 프로그램의 설정을 관리하는 "유즈케이스"입니다.
 * 설정 조회, 수정, 초기화, 화이트리스트 관리를 담당합니다.
 *
 * [비유]
 * "설정 관리자"와 같습니다:
 * - 사용자가 설정 화면에서 버튼을 누르면
 * - 이 유즈케이스가 실제 저장소에 반영합니다
 *
 * [유즈케이스란?]
 * 클린 아키텍처에서 "사용자가 시스템으로 할 수 있는 작업"을 의미
 * 예: "설정 조회", "설정 변경", "화이트리스트 추가"
 *
 * [제공하는 기능]
 * - getSettings(): 모든 설정 조회
 * - updateSettings(): 설정 업데이트
 * - resetSettings(): 기본값으로 초기화
 * - manageWhitelist(): 화이트리스트 추가/제거
 * - isWhitelisted(): 화이트리스트 확인
 * - getWhitelistedDomains(): 화이트리스트 목록 조회
 *
 * [의존성]
 * - ISettingsRepository: 설정 저장소 (실제 구현: ChromeStorageSettingsRepository)
 *
 * [다른 파일과의 관계]
 * - Settings.ts (Popup): 설정 UI에서 이 유즈케이스 호출
 * - MessageHandler.ts: UPDATE_SETTINGS 메시지 수신 시 호출
 * - Container.ts: 의존성 주입으로 생성
 *
 * [흐름]
 * 팝업 설정 화면 → "AI 분석 켜기" 토글
 * → UPDATE_SETTINGS 메시지 → MessageHandler
 * → ManageSettingsUseCase.updateSettings()
 * → ChromeStorageSettingsRepository에 저장
 * ============================================================================
 */

import {
  SettingsUpdateDTO,
  WhitelistActionDTO
} from '@application/dto/AnalysisDTO';
import {
  ExtensionSettings,
  ISettingsRepository
} from '@domain/ports/ISettingsRepository';

/**
 * 유즈케이스 의존성
 */
export interface ManageSettingsUseCaseDeps {
  settingsRepository: ISettingsRepository;
}

/**
 * ManageSettingsUseCase 클래스
 */
export class ManageSettingsUseCase {
  private readonly settingsRepository: ISettingsRepository;

  constructor(deps: ManageSettingsUseCaseDeps) {
    this.settingsRepository = deps.settingsRepository;
  }

  /**
   * 모든 설정 조회
   */
  async getSettings(): Promise<ExtensionSettings> {
    return this.settingsRepository.getAll();
  }

  /**
   * 설정 업데이트
   */
  async updateSettings(update: SettingsUpdateDTO): Promise<void> {
    await this.settingsRepository.setMultiple(update);
  }

  /**
   * 설정 초기화
   */
  async resetSettings(): Promise<void> {
    await this.settingsRepository.reset();
  }

  /**
   * 화이트리스트 관리
   */
  async manageWhitelist(action: WhitelistActionDTO): Promise<void> {
    if (action.action === 'add') {
      await this.settingsRepository.addToWhitelist(action.domain);
    } else {
      await this.settingsRepository.removeFromWhitelist(action.domain);
    }
  }

  /**
   * 도메인이 화이트리스트에 있는지 확인
   */
  async isWhitelisted(domain: string): Promise<boolean> {
    return this.settingsRepository.isWhitelisted(domain);
  }

  /**
   * 화이트리스트 도메인 목록 조회
   */
  async getWhitelistedDomains(): Promise<string[]> {
    const settings = await this.settingsRepository.getAll();
    return settings.whitelistedDomains;
  }
}
