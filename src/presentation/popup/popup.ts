/**
 * ============================================================================
 * 파일: popup.ts
 * ============================================================================
 *
 * [역할]
 * 확장 프로그램 팝업의 진입점(Entry Point)입니다.
 * 브라우저 툴바의 확장 아이콘을 클릭하면 열리는 UI를 관리합니다.
 *
 * [비유]
 * "보안 대시보드"와 같습니다:
 * - 현재 사이트의 보안 상태 한눈에 확인 (신호등)
 * - 최근 탐지 이벤트 목록 조회
 * - 설정 변경 (화이트리스트, 알림 등)
 *
 * [팝업 UI 구조]
 * ```
 * ┌─────────────────────────────────────┐
 * │        🚦 신호등 (상태 표시)        │
 * │        current-domain.com          │
 * ├─────────────────────────────────────┤
 * │   [이벤트]       [설정]            │  ← 탭 버튼
 * ├─────────────────────────────────────┤
 * │                                     │
 * │   (탭 콘텐츠)                       │
 * │   - 이벤트 탭: 최근 탐지 목록       │
 * │   - 설정 탭: 설정 패널             │
 * │                                     │
 * └─────────────────────────────────────┘
 * ```
 *
 * [탭 구조]
 * - events: 최근 탐지 이벤트 목록 (EventList)
 * - settings: 설정 관리 (Settings)
 *
 * [데이터 로드 흐름]
 * ```
 * initialize()
 *     ├→ loadCurrentTab() - 현재 탭 URL에서 도메인 추출
 *     ├→ renderUI() - UI 컴포넌트 렌더링
 *     └→ loadData()
 *         ├→ loadSecurityStatus() - 보안 상태 조회
 *         ├→ loadEvents() - 이벤트 목록 조회
 *         └→ loadSettings() - 설정 조회
 * ```
 *
 * [백그라운드 통신]
 * chrome.runtime.sendMessage로 백그라운드와 통신:
 * - GET_STATUS: 보안 상태 조회
 * - GET_EVENTS: 이벤트 목록 조회
 * - UPDATE_SETTINGS: 설정 변경
 * - CLEAR_DATA: 데이터 삭제
 *
 * [주요 메서드]
 * - initialize(): 앱 초기화
 * - destroy(): 앱 종료
 * - switchTab(tab): 탭 전환
 * - handleSettingsChange(): 설정 변경 처리
 * - handleWhitelistChange(): 화이트리스트 변경 처리
 *
 * [다른 파일과의 관계]
 * - components/TrafficLight.ts: 신호등 UI
 * - components/EventList.ts: 이벤트 목록
 * - components/Settings.ts: 설정 패널
 * - background/index.ts: 메시지 수신자
 * - popup.html: HTML 템플릿
 * - popup.css: 스타일
 *
 * [초기화 시점]
 * DOMContentLoaded 이벤트 후 자동으로 initialize() 호출
 * ============================================================================
 */

import { MessageType } from '@domain/ports/IMessenger';
import { Verdict } from '@domain/value-objects/Verdict';

import {
  TrafficLight,
  EventList,
  Settings,
  DetectionEventSummary,
  SettingsState
} from './components';

/**
 * 보안 상태 응답 인터페이스
 */
interface SecurityStatusResponse {
  overallStatus: 'safe' | 'warning' | 'danger' | 'unknown';
  currentDomain: string;
  isWhitelisted: boolean;
  recentDangerCount: number;
  recentSuspiciousCount: number;
  totalEventCount: number;
  aiEnabled: boolean;
}

/**
 * 탭 타입
 */
export type TabType = 'events' | 'settings';

/**
 * PopupApp 클래스
 */
export class PopupApp {
  private mainContainer: HTMLElement | null = null;
  private trafficLight: TrafficLight | null = null;
  private eventList: EventList | null = null;
  private settings: Settings | null = null;
  private currentStatus: Verdict = Verdict.UNKNOWN;
  private activeTab: TabType = 'events';
  private currentDomain: string = '';

  /**
   * 앱 초기화
   */
  async initialize(): Promise<void> {
    this.mainContainer = document.querySelector('.main');
    if (this.mainContainer === null) {
      return;
    }

    // 현재 탭 정보 조회
    await this.loadCurrentTab();

    // UI 렌더링
    this.renderUI();

    // 데이터 로드
    await this.loadData();
  }

  /**
   * 앱 종료
   */
  destroy(): void {
    this.trafficLight?.destroy();
    this.eventList?.destroy();
    this.settings?.destroy();

    if (this.mainContainer !== null) {
      this.mainContainer.innerHTML = '';
    }
  }

  /**
   * 현재 상태 반환
   */
  getCurrentStatus(): Verdict {
    return this.currentStatus;
  }

  /**
   * 현재 활성 탭 반환
   */
  getActiveTab(): TabType {
    return this.activeTab;
  }

  /**
   * 현재 탭 정보 로드
   */
  private loadCurrentTab(): Promise<void> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const firstTab = tabs[0];
        const tabUrl = firstTab?.url;
        if (tabUrl !== undefined) {
          try {
            const url = new URL(tabUrl);
            this.currentDomain = url.hostname;
          } catch {
            this.currentDomain = '';
          }
        }
        resolve();
      });
    });
  }

  /**
   * UI 렌더링
   */
  private renderUI(): void {
    if (this.mainContainer === null) {
      return;
    }

    this.mainContainer.innerHTML = `
      <div class="status-section">
        <div id="traffic-light-container"></div>
        <div class="domain-info">
          <span class="current-domain">${this.escapeHtml(this.currentDomain) || '알 수 없음'}</span>
        </div>
      </div>

      <div class="tabs">
        <button type="button" class="tab-button active" data-tab="events">이벤트</button>
        <button type="button" class="tab-button" data-tab="settings">설정</button>
      </div>

      <div class="tab-content">
        <div id="events-container" data-tab-content="events"></div>
        <div id="settings-container" data-tab-content="settings" style="display: none;"></div>
      </div>
    `;

    // 컴포넌트 초기화
    const trafficLightContainer = document.getElementById('traffic-light-container');
    if (trafficLightContainer !== null) {
      this.trafficLight = new TrafficLight(trafficLightContainer);
      this.trafficLight.render();
    }

    const eventsContainer = document.getElementById('events-container');
    if (eventsContainer !== null) {
      this.eventList = new EventList(eventsContainer);
      this.eventList.render();
      this.eventList.onEventClick((eventId) => {
        this.handleEventClick(eventId);
      });
    }

    const settingsContainer = document.getElementById('settings-container');
    if (settingsContainer !== null) {
      this.settings = new Settings(settingsContainer);
      this.settings.render();
      this.bindSettingsEvents();
    }

    // 탭 이벤트 바인딩
    this.bindTabEvents();
  }

  /**
   * 탭 이벤트 바인딩
   */
  private bindTabEvents(): void {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-button');
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-tab') as TabType;
        this.switchTab(tab);
      });
    });
  }

  /**
   * 탭 전환
   */
  private switchTab(tab: TabType): void {
    this.activeTab = tab;

    // 버튼 활성화 상태 업데이트
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-button');
    tabButtons.forEach((button) => {
      const buttonTab = button.getAttribute('data-tab');
      button.classList.toggle('active', buttonTab === tab);
    });

    // 콘텐츠 표시/숨김
    const tabContents = document.querySelectorAll<HTMLElement>('[data-tab-content]');
    tabContents.forEach((content) => {
      const contentTab = content.getAttribute('data-tab-content');
      content.style.display = contentTab === tab ? 'block' : 'none';
    });
  }

  /**
   * 설정 이벤트 바인딩
   */
  private bindSettingsEvents(): void {
    if (this.settings === null) {
      return;
    }

    this.settings.onSettingsChange((changes) => {
      void this.handleSettingsChange(changes);
    });

    this.settings.onClearData(() => {
      void this.handleClearData();
    });

    this.settings.onWhitelistChange((action, domain) => {
      void this.handleWhitelistChange(action, domain);
    });
  }

  /**
   * 데이터 로드
   */
  private async loadData(): Promise<void> {
    await Promise.all([
      this.loadSecurityStatus(),
      this.loadEvents(),
      this.loadSettings()
    ]);
  }

  /**
   * 보안 상태 로드
   */
  private loadSecurityStatus(): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: MessageType.GET_STATUS,
          payload: { currentDomain: this.currentDomain },
          timestamp: Date.now()
        },
        (response?: { success: boolean; data?: SecurityStatusResponse; error?: string }) => {
          // 응답이 없거나 에러인 경우 처리
          if (chrome.runtime.lastError) {
            console.warn('[Popup] Failed to get status:', chrome.runtime.lastError.message);
            this.currentStatus = Verdict.UNKNOWN;
            this.trafficLight?.setStatus(Verdict.UNKNOWN);
            resolve();
            return;
          }

          if (response?.success && response.data !== undefined) {
            this.currentStatus = this.mapStatusToVerdict(response.data.overallStatus);
            this.trafficLight?.setStatus(this.currentStatus);
          } else {
            this.currentStatus = Verdict.UNKNOWN;
            this.trafficLight?.setStatus(Verdict.UNKNOWN);
          }
          resolve();
        }
      );
    });
  }

  /**
   * 이벤트 로드
   */
  private loadEvents(): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: MessageType.GET_EVENTS,
          payload: { limit: 20, domain: this.currentDomain },
          timestamp: Date.now()
        },
        (response?: { success: boolean; data?: DetectionEventSummary[]; error?: string }) => {
          if (chrome.runtime.lastError) {
            console.warn('[Popup] Failed to get events:', chrome.runtime.lastError.message);
            resolve();
            return;
          }

          if (response?.success && Array.isArray(response.data)) {
            this.eventList?.setEvents(response.data);
          }
          resolve();
        }
      );
    });
  }

  /**
   * 설정 로드
   */
  private loadSettings(): Promise<void> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: MessageType.UPDATE_SETTINGS,
          payload: {},
          timestamp: Date.now()
        },
        (response?: {
          success: boolean;
          data?: {
            aiAnalysisEnabled: boolean;
            notificationsEnabled: boolean;
            showUnknownWarnings: boolean;
            whitelistedDomains: string[];
          };
          error?: string;
        }) => {
          if (chrome.runtime.lastError) {
            console.warn('[Popup] Failed to get settings:', chrome.runtime.lastError.message);
            resolve();
            return;
          }

          if (response?.success && response.data !== undefined) {
            this.settings?.setSettings({
              aiEnabled: response.data.aiAnalysisEnabled,
              notificationsEnabled: response.data.notificationsEnabled,
              showUnknownWarnings: response.data.showUnknownWarnings ?? true,
              whitelistedDomains: response.data.whitelistedDomains ?? []
            });
          }
          resolve();
        }
      );
    });
  }

  /**
   * 설정 변경 처리
   */
  private async handleSettingsChange(changes: Partial<SettingsState>): Promise<void> {
    const payload: Record<string, unknown> = {};

    if (changes.aiEnabled !== undefined) {
      payload['aiAnalysisEnabled'] = changes.aiEnabled;
    }
    if (changes.notificationsEnabled !== undefined) {
      payload['notificationsEnabled'] = changes.notificationsEnabled;
    }
    if (changes.showUnknownWarnings !== undefined) {
      payload['showUnknownWarnings'] = changes.showUnknownWarnings;
    }

    await this.sendMessage(MessageType.UPDATE_SETTINGS, payload);
  }

  /**
   * 데이터 삭제 처리
   */
  private async handleClearData(): Promise<void> {
    await this.sendMessage(MessageType.CLEAR_DATA, { all: true });
    this.eventList?.setEvents([]);
  }

  /**
   * 화이트리스트 변경 처리
   */
  private async handleWhitelistChange(action: 'add' | 'remove', domain: string): Promise<void> {
    await this.sendMessage(MessageType.UPDATE_SETTINGS, {
      whitelist: { action, domain }
    });

    // 설정 다시 로드
    await this.loadSettings();
  }

  /**
   * 이벤트 클릭 처리
   */
  private handleEventClick(_eventId: string): void {
    // 이벤트 상세 보기 (향후 구현)
    // TODO: 이벤트 상세 모달 표시
  }

  /**
   * 메시지 전송
   */
  private sendMessage(type: MessageType, payload: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type, payload, timestamp: Date.now() },
        (response) => {
          resolve(response);
        }
      );
    });
  }

  /**
   * 상태를 Verdict로 변환
   */
  private mapStatusToVerdict(status: string): Verdict {
    switch (status) {
      case 'safe':
        return Verdict.SAFE;
      case 'warning':
        return Verdict.SUSPICIOUS;
      case 'danger':
        return Verdict.DANGEROUS;
      default:
        return Verdict.UNKNOWN;
    }
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

// DOM 로드 후 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupApp();
  void app.initialize();
});
