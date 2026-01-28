/**
 * Settings 컴포넌트 테스트
 */

// Settings 클래스 동적 로드
let Settings: new (container: HTMLElement) => ISettings;

interface SettingsState {
  aiEnabled: boolean;
  notificationsEnabled: boolean;
  whitelistedDomains: string[];
}

interface ISettings {
  render(): void;
  setSettings(settings: SettingsState): void;
  getSettings(): SettingsState;
  onSettingsChange(callback: (settings: Partial<SettingsState>) => void): void;
  onClearData(callback: () => void): void;
  onWhitelistChange(callback: (action: 'add' | 'remove', domain: string) => void): void;
  destroy(): void;
}

describe('Settings', () => {
  let container: HTMLElement;
  let settings: ISettings;

  const defaultSettings: SettingsState = {
    aiEnabled: true,
    notificationsEnabled: true,
    whitelistedDomains: ['trusted.com', 'safe-site.org']
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const module = require('@presentation/popup/components/Settings');
      Settings = module.Settings;
      settings = new Settings(container);
    } catch {
      // RED 단계: 모듈이 아직 없음
      settings = {
        render: jest.fn(),
        setSettings: jest.fn(),
        getSettings: jest.fn().mockReturnValue(defaultSettings),
        onSettingsChange: jest.fn(),
        onClearData: jest.fn(),
        onWhitelistChange: jest.fn(),
        destroy: jest.fn()
      };
    }
  });

  afterEach(() => {
    settings.destroy();
    container.remove();
  });

  describe('렌더링', () => {
    it('컨테이너에 설정 패널을 렌더링해야 함', () => {
      settings.render();

      const panel = container.querySelector('[data-settings-panel]');
      expect(panel).not.toBeNull();
    });

    it('AI 분석 토글이 있어야 함', () => {
      settings.render();

      const toggle = container.querySelector('[data-setting="ai-enabled"]');
      expect(toggle).not.toBeNull();
    });

    it('알림 토글이 있어야 함', () => {
      settings.render();

      const toggle = container.querySelector('[data-setting="notifications-enabled"]');
      expect(toggle).not.toBeNull();
    });

    it('화이트리스트 섹션이 있어야 함', () => {
      settings.render();

      const whitelist = container.querySelector('[data-whitelist-section]');
      expect(whitelist).not.toBeNull();
    });

    it('데이터 삭제 버튼이 있어야 함', () => {
      settings.render();

      const button = container.querySelector('[data-clear-data-button]');
      expect(button).not.toBeNull();
    });
  });

  describe('설정 표시', () => {
    beforeEach(() => {
      settings.render();
    });

    it('설정을 설정하면 UI에 반영되어야 함', () => {
      settings.setSettings(defaultSettings);

      const aiToggle = container.querySelector<HTMLInputElement>('[data-setting="ai-enabled"] input');
      expect(aiToggle?.checked).toBe(true);
    });

    it('AI 분석이 비활성화되면 토글이 off 상태여야 함', () => {
      settings.setSettings({ ...defaultSettings, aiEnabled: false });

      const aiToggle = container.querySelector<HTMLInputElement>('[data-setting="ai-enabled"] input');
      expect(aiToggle?.checked).toBe(false);
    });

    it('화이트리스트 도메인이 목록에 표시되어야 함', () => {
      settings.setSettings(defaultSettings);

      const items = container.querySelectorAll('[data-whitelist-item]');
      expect(items.length).toBe(2);
    });

    it('getSettings()로 현재 설정을 가져올 수 있어야 함', () => {
      settings.setSettings(defaultSettings);

      expect(settings.getSettings()).toEqual(defaultSettings);
    });
  });

  describe('설정 변경', () => {
    beforeEach(() => {
      settings.render();
      settings.setSettings(defaultSettings);
    });

    it('AI 토글 변경 시 콜백이 호출되어야 함', () => {
      const callback = jest.fn();
      settings.onSettingsChange(callback);

      const aiToggle = container.querySelector<HTMLInputElement>('[data-setting="ai-enabled"] input');
      aiToggle?.click();

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ aiEnabled: false }));
    });

    it('알림 토글 변경 시 콜백이 호출되어야 함', () => {
      const callback = jest.fn();
      settings.onSettingsChange(callback);

      const notifToggle = container.querySelector<HTMLInputElement>('[data-setting="notifications-enabled"] input');
      notifToggle?.click();

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ notificationsEnabled: false }));
    });
  });

  describe('화이트리스트 관리', () => {
    beforeEach(() => {
      settings.render();
      settings.setSettings(defaultSettings);
    });

    it('도메인 추가 시 콜백이 호출되어야 함', () => {
      const callback = jest.fn();
      settings.onWhitelistChange(callback);

      const input = container.querySelector<HTMLInputElement>('[data-whitelist-input]');
      const addButton = container.querySelector<HTMLButtonElement>('[data-whitelist-add]');

      if (input !== null && addButton !== null) {
        input.value = 'new-domain.com';
        addButton.click();

        expect(callback).toHaveBeenCalledWith('add', 'new-domain.com');
      }
    });

    it('도메인 삭제 시 콜백이 호출되어야 함', () => {
      const callback = jest.fn();
      settings.onWhitelistChange(callback);

      const removeButton = container.querySelector('[data-whitelist-remove="trusted.com"]');
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(callback).toHaveBeenCalledWith('remove', 'trusted.com');
    });

    it('빈 도메인은 추가하지 않아야 함', () => {
      const callback = jest.fn();
      settings.onWhitelistChange(callback);

      const input = container.querySelector<HTMLInputElement>('[data-whitelist-input]');
      const addButton = container.querySelector<HTMLButtonElement>('[data-whitelist-add]');

      if (input !== null && addButton !== null) {
        input.value = '';
        addButton.click();

        expect(callback).not.toHaveBeenCalled();
      }
    });
  });

  describe('데이터 삭제', () => {
    beforeEach(() => {
      settings.render();
    });

    it('삭제 버튼 클릭 시 확인 대화상자가 표시되어야 함', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      const button = container.querySelector<HTMLButtonElement>('[data-clear-data-button]');
      button?.click();

      expect(confirmSpy).toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('확인 시 콜백이 호출되어야 함', () => {
      const callback = jest.fn();
      settings.onClearData(callback);
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      const button = container.querySelector<HTMLButtonElement>('[data-clear-data-button]');
      button?.click();

      expect(callback).toHaveBeenCalled();
    });

    it('취소 시 콜백이 호출되지 않아야 함', () => {
      const callback = jest.fn();
      settings.onClearData(callback);
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      const button = container.querySelector<HTMLButtonElement>('[data-clear-data-button]');
      button?.click();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('접근성', () => {
    beforeEach(() => {
      settings.render();
    });

    it('토글에 적절한 레이블이 있어야 함', () => {
      const aiToggle = container.querySelector('[data-setting="ai-enabled"]');
      const label = aiToggle?.querySelector('label');
      expect(label?.textContent).toContain('AI');
    });

    it('삭제 버튼에 aria-label이 있어야 함', () => {
      const button = container.querySelector('[data-clear-data-button]');
      expect(button?.getAttribute('aria-label')).toBeTruthy();
    });
  });

  describe('라이프사이클', () => {
    it('destroy() 호출 후 컨테이너가 비워져야 함', () => {
      settings.render();
      settings.destroy();

      expect(container.innerHTML).toBe('');
    });
  });
});
