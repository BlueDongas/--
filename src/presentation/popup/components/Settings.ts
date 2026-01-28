/**
 * ============================================================================
 * 파일: Settings.ts
 * ============================================================================
 *
 * [역할]
 * 확장 프로그램의 설정 UI를 관리합니다.
 * 사용자가 AI 분석, 알림, 화이트리스트 등을 설정할 수 있습니다.
 *
 * [비유]
 * "시스템 설정 패널"과 같습니다:
 * - 각종 기능 on/off 스위치
 * - 신뢰할 수 있는 사이트 목록 관리
 * - 데이터 삭제 기능
 *
 * [설정 항목 UI]
 * ```
 * ┌─────────────────────────────────────────────┐
 * │ 분석 설정                                   │
 * │ ┌─────────────────────────────────────────┐ │
 * │ │ [✓] AI 분석 사용                        │ │
 * │ │     AWS Bedrock AI를 사용하여           │ │
 * │ │     더 정확한 탐지를 수행합니다.        │ │
 * │ │ [✓] 알림 표시                           │ │
 * │ │ [✓] 확인 필요 경고 표시                 │ │
 * │ └─────────────────────────────────────────┘ │
 * │                                             │
 * │ 화이트리스트                                │
 * │ ┌─────────────────────────────────────────┐ │
 * │ │ [도메인 입력________] [추가]            │ │
 * │ │ • trusted.com    [X]                    │ │
 * │ │ • mybank.com     [X]                    │ │
 * │ └─────────────────────────────────────────┘ │
 * │                                             │
 * │ 데이터 관리                                 │
 * │ [ 🗑 모든 데이터 삭제 ]                     │
 * └─────────────────────────────────────────────┘
 * ```
 *
 * [설정 항목]
 * - aiEnabled: AI 분석 사용 여부
 * - notificationsEnabled: 알림 표시 여부
 * - showUnknownWarnings: 확인 필요(UNKNOWN) 경고 표시 여부
 * - whitelistedDomains: 화이트리스트 도메인 목록
 *
 * [콜백 이벤트]
 * - onSettingsChange: 설정 변경 시
 * - onClearData: 데이터 삭제 버튼 클릭 시
 * - onWhitelistChange: 화이트리스트 추가/삭제 시
 *
 * [주요 메서드]
 * - render(): 설정 패널 렌더링
 * - setSettings(state): 설정 값 적용
 * - getSettings(): 현재 설정 반환
 * - destroy(): 컴포넌트 제거
 *
 * [다른 파일과의 관계]
 * - popup/popup.ts: 이 컴포넌트 사용
 * - ManageSettingsUseCase.ts: 설정 저장/로드
 * - ISettingsRepository.ts: 설정 저장소
 *
 * [보안 고려사항]
 * - HTML 이스케이프로 XSS 방지 (escapeHtml)
 * - 데이터 삭제 전 confirm 확인
 * ============================================================================
 */

/**
 * 설정 상태 인터페이스
 */
export interface SettingsState {
  aiEnabled: boolean;
  notificationsEnabled: boolean;
  showUnknownWarnings: boolean;
  whitelistedDomains: string[];
}

/**
 * 설정 변경 콜백 타입
 */
export type SettingsChangeCallback = (settings: Partial<SettingsState>) => void;

/**
 * 데이터 삭제 콜백 타입
 */
export type ClearDataCallback = () => void;

/**
 * 화이트리스트 변경 콜백 타입
 */
export type WhitelistChangeCallback = (action: 'add' | 'remove', domain: string) => void;

/**
 * Settings 클래스
 */
export class Settings {
  private container: HTMLElement;
  private element: HTMLElement | null = null;
  private state: SettingsState = {
    aiEnabled: true,
    notificationsEnabled: true,
    showUnknownWarnings: true,
    whitelistedDomains: []
  };

  private settingsChangeCallbacks: Set<SettingsChangeCallback> = new Set();
  private clearDataCallbacks: Set<ClearDataCallback> = new Set();
  private whitelistChangeCallbacks: Set<WhitelistChangeCallback> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 설정 패널 렌더링
   */
  render(): void {
    if (this.element !== null) {
      this.element.remove();
    }

    this.element = document.createElement('div');
    this.element.setAttribute('data-settings-panel', 'true');
    this.element.className = 'settings-panel';

    this.element.innerHTML = `
      <div class="settings-section">
        <h3>분석 설정</h3>
        <div class="setting-item" data-setting="ai-enabled">
          <label>
            <input type="checkbox" ${this.state.aiEnabled ? 'checked' : ''}>
            <span>AI 분석 사용</span>
          </label>
          <p class="setting-description">AWS Bedrock AI를 사용하여 더 정확한 탐지를 수행합니다.</p>
        </div>
        <div class="setting-item" data-setting="notifications-enabled">
          <label>
            <input type="checkbox" ${this.state.notificationsEnabled ? 'checked' : ''}>
            <span>알림 표시</span>
          </label>
          <p class="setting-description">위험 탐지 시 알림을 표시합니다.</p>
        </div>
        <div class="setting-item" data-setting="show-unknown-warnings">
          <label>
            <input type="checkbox" ${this.state.showUnknownWarnings ? 'checked' : ''}>
            <span>확인 필요 경고 표시</span>
          </label>
          <p class="setting-description">규칙에 매칭되지 않은 의심 요청에 대해 노란색 경고창을 표시합니다.</p>
        </div>
      </div>

      <div class="settings-section" data-whitelist-section>
        <h3>화이트리스트</h3>
        <div class="whitelist-input-group">
          <input type="text" data-whitelist-input placeholder="도메인 입력 (예: example.com)">
          <button type="button" data-whitelist-add>추가</button>
        </div>
        <ul class="whitelist-items" data-whitelist-list></ul>
      </div>

      <div class="settings-section">
        <h3>데이터 관리</h3>
        <button type="button" class="danger-button" data-clear-data-button aria-label="모든 데이터 삭제">
          모든 데이터 삭제
        </button>
        <p class="setting-description">저장된 모든 탐지 이벤트를 삭제합니다.</p>
      </div>
    `;

    this.container.appendChild(this.element);
    this.bindEvents();
    this.updateWhitelistDisplay();
  }

  /**
   * 설정 적용
   */
  setSettings(newSettings: SettingsState): void {
    this.state = { ...newSettings };
    this.updateDisplay();
  }

  /**
   * 현재 설정 반환
   */
  getSettings(): SettingsState {
    return { ...this.state };
  }

  /**
   * 설정 변경 콜백 등록
   */
  onSettingsChange(callback: SettingsChangeCallback): void {
    this.settingsChangeCallbacks.add(callback);
  }

  /**
   * 데이터 삭제 콜백 등록
   */
  onClearData(callback: ClearDataCallback): void {
    this.clearDataCallbacks.add(callback);
  }

  /**
   * 화이트리스트 변경 콜백 등록
   */
  onWhitelistChange(callback: WhitelistChangeCallback): void {
    this.whitelistChangeCallbacks.add(callback);
  }

  /**
   * 컴포넌트 제거
   */
  destroy(): void {
    if (this.element !== null) {
      this.element.remove();
      this.element = null;
    }
    this.container.innerHTML = '';
    this.settingsChangeCallbacks.clear();
    this.clearDataCallbacks.clear();
    this.whitelistChangeCallbacks.clear();
  }

  /**
   * 이벤트 바인딩
   */
  private bindEvents(): void {
    if (this.element === null) {
      return;
    }

    // AI 토글
    const aiToggle = this.element.querySelector<HTMLInputElement>('[data-setting="ai-enabled"] input');
    aiToggle?.addEventListener('change', () => {
      this.state.aiEnabled = aiToggle.checked;
      this.notifySettingsChange({ aiEnabled: aiToggle.checked });
    });

    // 알림 토글
    const notifToggle = this.element.querySelector<HTMLInputElement>('[data-setting="notifications-enabled"] input');
    notifToggle?.addEventListener('change', () => {
      this.state.notificationsEnabled = notifToggle.checked;
      this.notifySettingsChange({ notificationsEnabled: notifToggle.checked });
    });

    // 확인 필요 경고 토글
    const unknownToggle = this.element.querySelector<HTMLInputElement>('[data-setting="show-unknown-warnings"] input');
    unknownToggle?.addEventListener('change', () => {
      this.state.showUnknownWarnings = unknownToggle.checked;
      this.notifySettingsChange({ showUnknownWarnings: unknownToggle.checked });
    });

    // 화이트리스트 추가
    const addButton = this.element.querySelector<HTMLButtonElement>('[data-whitelist-add]');
    const input = this.element.querySelector<HTMLInputElement>('[data-whitelist-input]');
    addButton?.addEventListener('click', () => {
      const domain = input?.value.trim();
      if (domain !== undefined && domain !== '') {
        this.notifyWhitelistChange('add', domain);
        if (input !== null) {
          input.value = '';
        }
      }
    });

    // 데이터 삭제
    const clearButton = this.element.querySelector<HTMLButtonElement>('[data-clear-data-button]');
    clearButton?.addEventListener('click', () => {
      if (window.confirm('모든 탐지 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        this.notifyClearData();
      }
    });
  }

  /**
   * 디스플레이 업데이트
   */
  private updateDisplay(): void {
    if (this.element === null) {
      return;
    }

    // 토글 상태 업데이트
    const aiToggle = this.element.querySelector<HTMLInputElement>('[data-setting="ai-enabled"] input');
    if (aiToggle !== null) {
      aiToggle.checked = this.state.aiEnabled;
    }

    const notifToggle = this.element.querySelector<HTMLInputElement>('[data-setting="notifications-enabled"] input');
    if (notifToggle !== null) {
      notifToggle.checked = this.state.notificationsEnabled;
    }

    const unknownToggle = this.element.querySelector<HTMLInputElement>('[data-setting="show-unknown-warnings"] input');
    if (unknownToggle !== null) {
      unknownToggle.checked = this.state.showUnknownWarnings;
    }

    // 화이트리스트 업데이트
    this.updateWhitelistDisplay();
  }

  /**
   * 화이트리스트 디스플레이 업데이트
   */
  private updateWhitelistDisplay(): void {
    if (this.element === null) {
      return;
    }

    const list = this.element.querySelector('[data-whitelist-list]');
    if (list === null) {
      return;
    }

    list.innerHTML = '';

    for (const domain of this.state.whitelistedDomains) {
      const item = document.createElement('li');
      item.setAttribute('data-whitelist-item', 'true');
      item.className = 'whitelist-item';

      item.innerHTML = `
        <span class="whitelist-domain">${this.escapeHtml(domain)}</span>
        <button type="button" data-whitelist-remove="${this.escapeHtml(domain)}" aria-label="${domain} 삭제">
          <span aria-hidden="true">&times;</span>
        </button>
      `;

      const removeButton = item.querySelector<HTMLButtonElement>(`[data-whitelist-remove="${domain}"]`);
      removeButton?.addEventListener('click', () => {
        this.notifyWhitelistChange('remove', domain);
      });

      list.appendChild(item);
    }
  }

  /**
   * 설정 변경 알림
   */
  private notifySettingsChange(changes: Partial<SettingsState>): void {
    this.settingsChangeCallbacks.forEach((callback) => {
      callback(changes);
    });
  }

  /**
   * 데이터 삭제 알림
   */
  private notifyClearData(): void {
    this.clearDataCallbacks.forEach((callback) => {
      callback();
    });
  }

  /**
   * 화이트리스트 변경 알림
   */
  private notifyWhitelistChange(action: 'add' | 'remove', domain: string): void {
    this.whitelistChangeCallbacks.forEach((callback) => {
      callback(action, domain);
    });
  }

  /**
   * HTML 이스케이프
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
