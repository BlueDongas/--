/**
 * Popup 메인 테스트
 */

import { Verdict } from '@domain/value-objects/Verdict';

// PopupApp 클래스 동적 로드
let PopupApp: new () => IPopupApp;

interface IPopupApp {
  initialize(): Promise<void>;
  destroy(): void;
  getCurrentStatus(): Verdict;
}

// Mock Chrome API
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null as { message?: string } | null
  },
  tabs: {
    query: jest.fn()
  }
};

(global as { chrome: typeof mockChrome }).chrome = mockChrome;

describe('PopupApp', () => {
  let app: IPopupApp;

  beforeEach(() => {
    // DOM 설정
    document.body.innerHTML = `
      <div id="app">
        <header class="header">
          <h1>FormJacking Guard</h1>
        </header>
        <main class="main"></main>
      </div>
    `;

    // Chrome API Mock 초기화
    mockChrome.runtime.sendMessage.mockReset();
    mockChrome.tabs.query.mockReset();

    // 기본 응답 설정
    mockChrome.tabs.query.mockImplementation((_query, callback) => {
      callback([{ id: 1, url: 'https://example.com' }]);
    });

    mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
      if (callback !== undefined) {
        callback({
          success: true,
          data: {
            overallStatus: 'safe',
            currentDomain: 'example.com',
            isWhitelisted: false,
            recentDangerCount: 0,
            recentSuspiciousCount: 0,
            totalEventCount: 0,
            aiEnabled: true
          }
        });
      }
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const module = require('@presentation/popup/popup');
      PopupApp = module.PopupApp;
      app = new PopupApp();
    } catch {
      // RED 단계: 모듈이 아직 없음
      app = {
        initialize: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn(),
        getCurrentStatus: jest.fn().mockReturnValue(Verdict.UNKNOWN)
      };
    }
  });

  afterEach(() => {
    app.destroy();
    document.body.innerHTML = '';
  });

  describe('초기화', () => {
    it('initialize()를 호출하면 UI가 렌더링되어야 함', async () => {
      await app.initialize();

      const trafficLight = document.querySelector('[data-traffic-light]');
      expect(trafficLight).not.toBeNull();
    });

    it('현재 탭 정보를 조회해야 함', async () => {
      await app.initialize();

      expect(mockChrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
    });

    it('보안 상태를 조회해야 함', async () => {
      await app.initialize();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'GET_STATUS' }),
        expect.any(Function)
      );
    });

    it('신호등이 현재 상태를 표시해야 함', async () => {
      await app.initialize();

      // safe 상태이므로 녹색이어야 함
      expect(app.getCurrentStatus()).toBe(Verdict.SAFE);
    });
  });

  describe('상태 표시', () => {
    it('위험 상태일 때 적색 신호등을 표시해야 함', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
        if (callback !== undefined) {
          callback({
            success: true,
            data: {
              overallStatus: 'danger',
              currentDomain: 'example.com',
              isWhitelisted: false,
              recentDangerCount: 3,
              recentSuspiciousCount: 0,
              totalEventCount: 5,
              aiEnabled: true
            }
          });
        }
      });

      await app.initialize();

      expect(app.getCurrentStatus()).toBe(Verdict.DANGEROUS);
    });

    it('의심 상태일 때 황색 신호등을 표시해야 함', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
        if (callback !== undefined) {
          callback({
            success: true,
            data: {
              overallStatus: 'warning',
              currentDomain: 'example.com',
              isWhitelisted: false,
              recentDangerCount: 0,
              recentSuspiciousCount: 2,
              totalEventCount: 3,
              aiEnabled: true
            }
          });
        }
      });

      await app.initialize();

      expect(app.getCurrentStatus()).toBe(Verdict.SUSPICIOUS);
    });
  });

  describe('탭 구조', () => {
    it('이벤트 탭이 있어야 함', async () => {
      await app.initialize();

      const eventsTab = document.querySelector('[data-tab="events"]');
      expect(eventsTab).not.toBeNull();
    });

    it('설정 탭이 있어야 함', async () => {
      await app.initialize();

      const settingsTab = document.querySelector('[data-tab="settings"]');
      expect(settingsTab).not.toBeNull();
    });

    it('탭 클릭 시 해당 콘텐츠가 표시되어야 함', async () => {
      await app.initialize();

      const settingsTab = document.querySelector<HTMLElement>('[data-tab="settings"]');
      settingsTab?.click();

      const settingsPanel = document.querySelector('[data-settings-panel]');
      expect(settingsPanel).not.toBeNull();
    });
  });

  describe('에러 처리', () => {
    it('API 에러 시에도 UI가 표시되어야 함', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((_message, callback) => {
        if (callback !== undefined) {
          callback({ success: false, error: 'Connection failed' });
        }
      });

      await app.initialize();

      // 에러 시에도 기본 UI는 표시
      const trafficLight = document.querySelector('[data-traffic-light]');
      expect(trafficLight).not.toBeNull();
    });

    it('탭 조회 실패 시에도 UI가 표시되어야 함', async () => {
      mockChrome.tabs.query.mockImplementation((_query, callback) => {
        callback([]);
      });

      await app.initialize();

      const trafficLight = document.querySelector('[data-traffic-light]');
      expect(trafficLight).not.toBeNull();
    });
  });

  describe('라이프사이클', () => {
    it('destroy() 호출 후 컴포넌트가 정리되어야 함', async () => {
      await app.initialize();
      app.destroy();

      // main 영역이 비어있어야 함
      const main = document.querySelector('.main');
      expect(main?.children.length).toBe(0);
    });
  });
});
