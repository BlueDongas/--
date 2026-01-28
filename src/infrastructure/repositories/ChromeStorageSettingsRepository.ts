/**
 * ============================================================================
 * 파일: ChromeStorageSettingsRepository.ts
 * ============================================================================
 *
 * [역할]
 * ISettingsRepository 인터페이스의 실제 구현체입니다.
 * Chrome Storage Local API를 사용하여 설정을 영구 저장합니다.
 *
 * [비유]
 * "설정 파일 관리 프로그램"과 같습니다:
 * - 설정을 Chrome이 관리하는 저장 공간에 저장
 * - 브라우저를 닫아도 설정이 유지됨
 *
 * [Chrome Storage API란?]
 * Chrome 확장 프로그램 전용 저장소 API
 * - localStorage와 유사하지만 확장 프로그램에 특화
 * - 동기화(sync) 또는 로컬(local) 저장 선택 가능
 * - 이 구현은 local 저장소 사용 (기기별 저장)
 *
 * [저장 구조]
 * Chrome Storage에 'settings' 키로 JSON 객체 저장
 * ```
 * { settings: { aiAnalysisEnabled: true, ... } }
 * ```
 *
 * [주요 메서드]
 * - getAll(): 모든 설정 조회 (기본값 병합)
 * - get(key): 특정 설정 조회
 * - set(key, value): 특정 설정 변경
 * - setMultiple(): 여러 설정 한번에 변경
 * - reset(): 기본값으로 초기화
 * - isWhitelisted(): 화이트리스트 확인 (서브도메인 지원)
 * - addToWhitelist(): 화이트리스트 추가
 * - removeFromWhitelist(): 화이트리스트 제거
 *
 * [서브도메인 매칭]
 * example.com이 화이트리스트에 있으면
 * api.example.com, shop.example.com도 매칭됨
 *
 * [다른 파일과의 관계]
 * - ISettingsRepository.ts: 구현하는 인터페이스
 * - ManageSettingsUseCase.ts: 이 저장소를 사용
 * - Container.ts: 의존성 주입으로 인스턴스 생성
 *
 * [흐름]
 * ManageSettingsUseCase → ChromeStorageSettingsRepository.set()
 * → chrome.storage.local.set() → Chrome이 영구 저장
 * ============================================================================
 */

import {
  DEFAULT_SETTINGS,
  ExtensionSettings,
  ISettingsRepository
} from '@domain/ports/ISettingsRepository';

const STORAGE_KEY = 'settings';

/**
 * Chrome Storage 설정 저장소 구현체
 */
export class ChromeStorageSettingsRepository implements ISettingsRepository {
  /**
   * 모든 설정 조회
   */
  async getAll(): Promise<ExtensionSettings> {
    const stored = await this.getFromStorage();
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  /**
   * 특정 설정 조회
   */
  async get<K extends keyof ExtensionSettings>(
    key: K
  ): Promise<ExtensionSettings[K]> {
    const settings = await this.getAll();
    return settings[key];
  }

  /**
   * 특정 설정 업데이트
   */
  async set<K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ): Promise<void> {
    const current = await this.getAll();
    const updated = { ...current, [key]: value };
    await this.saveToStorage(updated);
  }

  /**
   * 여러 설정 업데이트
   */
  async setMultiple(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getAll();
    const updated = { ...current, ...settings };
    await this.saveToStorage(updated);
  }

  /**
   * 설정 초기화
   */
  async reset(): Promise<void> {
    await this.saveToStorage(DEFAULT_SETTINGS);
  }

  /**
   * 도메인이 화이트리스트에 있는지 확인
   */
  async isWhitelisted(domain: string): Promise<boolean> {
    const domains = await this.get('whitelistedDomains');
    return domains.some((whitelisted) => this.matchesDomain(domain, whitelisted));
  }

  /**
   * 화이트리스트에 도메인 추가
   */
  async addToWhitelist(domain: string): Promise<void> {
    const domains = await this.get('whitelistedDomains');
    if (!domains.includes(domain)) {
      await this.set('whitelistedDomains', [...domains, domain]);
    }
  }

  /**
   * 화이트리스트에서 도메인 제거
   */
  async removeFromWhitelist(domain: string): Promise<void> {
    const domains = await this.get('whitelistedDomains');
    await this.set(
      'whitelistedDomains',
      domains.filter((d) => d !== domain)
    );
  }

  /**
   * Chrome Storage에서 설정 조회
   */
  private getFromStorage(): Promise<Partial<ExtensionSettings>> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        const stored = result[STORAGE_KEY] as Partial<ExtensionSettings> | undefined;
        resolve(stored ?? {});
      });
    });
  }

  /**
   * Chrome Storage에 설정 저장
   */
  private saveToStorage(settings: ExtensionSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * 도메인 매칭 (서브도메인 지원)
   */
  private matchesDomain(target: string, whitelisted: string): boolean {
    if (target === whitelisted) {
      return true;
    }
    // 서브도메인 매칭: target이 whitelisted로 끝나고 그 앞이 .인 경우
    return target.endsWith(`.${whitelisted}`);
  }
}
