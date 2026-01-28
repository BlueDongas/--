/**
 * ============================================================================
 * 파일: ISettingsRepository.ts (포트/인터페이스)
 * ============================================================================
 *
 * [역할]
 * 확장 프로그램 설정을 저장하고 조회하는 "인터페이스"를 정의합니다.
 * 실제 구현은 ChromeStorageSettingsRepository.ts에 있습니다.
 *
 * [비유]
 * "설정 파일 관리자"와 같습니다:
 * - 어떤 설정 항목이 있는지 (ExtensionSettings)
 * - 기본값은 무엇인지 (DEFAULT_SETTINGS)
 * - 어떻게 읽고 쓰는지 정의
 *
 * [ExtensionSettings - 설정 항목들]
 * - aiAnalysisEnabled: AI 분석 사용 여부
 * - whitelistedDomains: 신뢰하는 도메인 목록 (검사 제외)
 * - notificationsEnabled: 알림 표시 여부
 * - autoBlockEnabled: 위험 감지 시 자동 차단
 * - debugMode: 개발자용 디버그 모드
 * - dataRetentionHours: 이벤트 보관 기간 (시간)
 * - showUnknownWarnings: UNKNOWN 판정 시 경고 표시 여부
 *
 * [주요 메서드]
 * - getAll(): 모든 설정 조회
 * - get(key): 특정 설정 조회
 * - set(key, value): 특정 설정 변경
 * - setMultiple(): 여러 설정 한번에 변경
 * - reset(): 기본값으로 초기화
 * - isWhitelisted(): 도메인이 화이트리스트에 있는지 확인
 * - addToWhitelist(): 화이트리스트에 추가
 * - removeFromWhitelist(): 화이트리스트에서 제거
 *
 * [다른 파일과의 관계]
 * - ChromeStorageSettingsRepository.ts: Chrome Storage API 구현
 * - Settings.ts (Popup): 설정 UI 컴포넌트
 * - ManageSettingsUseCase.ts: 설정 관리 유즈케이스
 * - ManageBlockingUseCase.ts: 차단 시 화이트리스트 연동
 *
 * [흐름]
 * 팝업에서 설정 변경 → ManageSettingsUseCase → ISettingsRepository.set()
 * → Chrome Storage에 저장 → 다음 탐지 시 설정 적용
 * ============================================================================
 */

/**
 * 확장 프로그램 설정
 */
export interface ExtensionSettings {
  /** AI 분석 활성화 여부 */
  aiAnalysisEnabled: boolean;
  /** 화이트리스트 도메인 */
  whitelistedDomains: string[];
  /** 알림 표시 여부 */
  notificationsEnabled: boolean;
  /** 자동 차단 활성화 여부 */
  autoBlockEnabled: boolean;
  /** 디버그 모드 */
  debugMode: boolean;
  /** 데이터 보관 기간 (시간) */
  dataRetentionHours: number;
  /** 확인 필요(UNKNOWN) 경고창 표시 여부 */
  showUnknownWarnings: boolean;
}

/**
 * 기본 설정 값
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  aiAnalysisEnabled: true,
  whitelistedDomains: [],
  notificationsEnabled: true,
  autoBlockEnabled: false,
  debugMode: false,
  dataRetentionHours: 24,
  showUnknownWarnings: true
};

/**
 * 설정 저장소 인터페이스
 */
export interface ISettingsRepository {
  /**
   * 모든 설정 조회
   */
  getAll(): Promise<ExtensionSettings>;

  /**
   * 특정 설정 조회
   */
  get<K extends keyof ExtensionSettings>(key: K): Promise<ExtensionSettings[K]>;

  /**
   * 특정 설정 업데이트
   */
  set<K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ): Promise<void>;

  /**
   * 여러 설정 업데이트
   */
  setMultiple(settings: Partial<ExtensionSettings>): Promise<void>;

  /**
   * 설정 초기화
   */
  reset(): Promise<void>;

  /**
   * 도메인이 화이트리스트에 있는지 확인
   */
  isWhitelisted(domain: string): Promise<boolean>;

  /**
   * 화이트리스트에 도메인 추가
   */
  addToWhitelist(domain: string): Promise<void>;

  /**
   * 화이트리스트에서 도메인 제거
   */
  removeFromWhitelist(domain: string): Promise<void>;
}
