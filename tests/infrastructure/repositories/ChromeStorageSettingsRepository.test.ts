/**
 * ChromeStorageSettingsRepository 테스트
 */

import {
  DEFAULT_SETTINGS,
  ExtensionSettings
} from '@domain/ports/ISettingsRepository';
import { ChromeStorageSettingsRepository } from '@infrastructure/repositories/ChromeStorageSettingsRepository';

describe('ChromeStorageSettingsRepository', () => {
  let repository: ChromeStorageSettingsRepository;
  let mockStorage: {
    get: jest.Mock;
    set: jest.Mock;
    remove: jest.Mock;
    clear: jest.Mock;
  };

  beforeEach(() => {
    // Chrome storage mock 설정
    mockStorage = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    };

    (chrome.storage.local as unknown) = mockStorage;

    // 기본적으로 빈 저장소 반환
    mockStorage.get.mockImplementation(
      (
        _keys: string | string[] | null,
        callback: (result: Record<string, unknown>) => void
      ) => {
        callback({});
      }
    );

    mockStorage.set.mockImplementation(
      (_items: Record<string, unknown>, callback?: () => void) => {
        if (callback) callback();
      }
    );

    mockStorage.clear.mockImplementation((callback?: () => void) => {
      if (callback) callback();
    });

    repository = new ChromeStorageSettingsRepository();
  });

  describe('getAll', () => {
    it('저장된 설정이 없으면 기본값을 반환해야 함', async () => {
      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback({});
        }
      );

      const settings = await repository.getAll();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('저장된 설정과 기본값을 병합해야 함', async () => {
      const storedSettings = {
        settings: {
          aiAnalysisEnabled: false,
          notificationsEnabled: false
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      const settings = await repository.getAll();

      expect(settings.aiAnalysisEnabled).toBe(false);
      expect(settings.notificationsEnabled).toBe(false);
      // 기본값이 병합되어야 함
      expect(settings.autoBlockEnabled).toBe(DEFAULT_SETTINGS.autoBlockEnabled);
      expect(settings.debugMode).toBe(DEFAULT_SETTINGS.debugMode);
    });
  });

  describe('get', () => {
    it('특정 설정 값을 반환해야 함', async () => {
      const storedSettings = {
        settings: {
          aiAnalysisEnabled: false
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      const value = await repository.get('aiAnalysisEnabled');

      expect(value).toBe(false);
    });

    it('저장되지 않은 키에 대해 기본값을 반환해야 함', async () => {
      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback({});
        }
      );

      const value = await repository.get('dataRetentionHours');

      expect(value).toBe(DEFAULT_SETTINGS.dataRetentionHours);
    });
  });

  describe('set', () => {
    it('특정 설정을 저장해야 함', async () => {
      await repository.set('aiAnalysisEnabled', false);

      expect(mockStorage.set).toHaveBeenCalled();
      const setCall = mockStorage.set.mock.calls[0] as [
        Record<string, unknown>,
        (() => void)?
      ];
      const savedData = setCall[0] as {
        settings: Partial<ExtensionSettings>;
      };
      expect(savedData.settings.aiAnalysisEnabled).toBe(false);
    });

    it('기존 설정을 유지하면서 특정 값만 업데이트해야 함', async () => {
      const existingSettings = {
        settings: {
          aiAnalysisEnabled: true,
          notificationsEnabled: true
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(existingSettings);
        }
      );

      await repository.set('debugMode', true);

      const setCall = mockStorage.set.mock.calls[0] as [
        Record<string, unknown>,
        (() => void)?
      ];
      const savedData = setCall[0] as {
        settings: Partial<ExtensionSettings>;
      };
      expect(savedData.settings.debugMode).toBe(true);
      expect(savedData.settings.aiAnalysisEnabled).toBe(true);
    });
  });

  describe('setMultiple', () => {
    it('여러 설정을 한 번에 업데이트해야 함', async () => {
      await repository.setMultiple({
        aiAnalysisEnabled: false,
        debugMode: true
      });

      expect(mockStorage.set).toHaveBeenCalled();
      const setCall = mockStorage.set.mock.calls[0] as [
        Record<string, unknown>,
        (() => void)?
      ];
      const savedData = setCall[0] as {
        settings: Partial<ExtensionSettings>;
      };
      expect(savedData.settings.aiAnalysisEnabled).toBe(false);
      expect(savedData.settings.debugMode).toBe(true);
    });
  });

  describe('reset', () => {
    it('설정을 기본값으로 초기화해야 함', async () => {
      await repository.reset();

      expect(mockStorage.set).toHaveBeenCalled();
      const setCall = mockStorage.set.mock.calls[0] as [
        Record<string, unknown>,
        (() => void)?
      ];
      const savedData = setCall[0] as { settings: ExtensionSettings };
      expect(savedData.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('isWhitelisted', () => {
    it('화이트리스트에 있는 도메인에 대해 true를 반환해야 함', async () => {
      const storedSettings = {
        settings: {
          whitelistedDomains: ['example.com', 'trusted.org']
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      const result = await repository.isWhitelisted('example.com');

      expect(result).toBe(true);
    });

    it('화이트리스트에 없는 도메인에 대해 false를 반환해야 함', async () => {
      const storedSettings = {
        settings: {
          whitelistedDomains: ['example.com']
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      const result = await repository.isWhitelisted('unknown.com');

      expect(result).toBe(false);
    });

    it('서브도메인을 매칭해야 함', async () => {
      const storedSettings = {
        settings: {
          whitelistedDomains: ['example.com']
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      const result = await repository.isWhitelisted('api.example.com');

      expect(result).toBe(true);
    });

    it('빈 화이트리스트에 대해 false를 반환해야 함', async () => {
      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback({});
        }
      );

      const result = await repository.isWhitelisted('example.com');

      expect(result).toBe(false);
    });
  });

  describe('addToWhitelist', () => {
    it('새 도메인을 화이트리스트에 추가해야 함', async () => {
      const storedSettings = {
        settings: {
          whitelistedDomains: ['existing.com']
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      await repository.addToWhitelist('new.com');

      expect(mockStorage.set).toHaveBeenCalled();
      const setCall = mockStorage.set.mock.calls[0] as [
        Record<string, unknown>,
        (() => void)?
      ];
      const savedData = setCall[0] as {
        settings: Partial<ExtensionSettings>;
      };
      expect(savedData.settings.whitelistedDomains).toContain('existing.com');
      expect(savedData.settings.whitelistedDomains).toContain('new.com');
    });

    it('이미 존재하는 도메인을 추가하면 중복되지 않아야 함', async () => {
      const storedSettings = {
        settings: {
          whitelistedDomains: ['example.com']
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      await repository.addToWhitelist('example.com');

      // 이미 존재하는 도메인이므로 set이 호출되지 않아야 함
      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    it('빈 화이트리스트에 도메인을 추가할 수 있어야 함', async () => {
      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback({});
        }
      );

      await repository.addToWhitelist('new.com');

      const setCall = mockStorage.set.mock.calls[0] as [
        Record<string, unknown>,
        (() => void)?
      ];
      const savedData = setCall[0] as {
        settings: Partial<ExtensionSettings>;
      };
      expect(savedData.settings.whitelistedDomains).toContain('new.com');
    });
  });

  describe('removeFromWhitelist', () => {
    it('화이트리스트에서 도메인을 제거해야 함', async () => {
      const storedSettings = {
        settings: {
          whitelistedDomains: ['example.com', 'other.com']
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      await repository.removeFromWhitelist('example.com');

      const setCall = mockStorage.set.mock.calls[0] as [
        Record<string, unknown>,
        (() => void)?
      ];
      const savedData = setCall[0] as {
        settings: Partial<ExtensionSettings>;
      };
      expect(savedData.settings.whitelistedDomains).not.toContain('example.com');
      expect(savedData.settings.whitelistedDomains).toContain('other.com');
    });

    it('존재하지 않는 도메인 제거 시 에러가 발생하지 않아야 함', async () => {
      const storedSettings = {
        settings: {
          whitelistedDomains: ['example.com']
        }
      };

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback(storedSettings);
        }
      );

      await expect(
        repository.removeFromWhitelist('nonexistent.com')
      ).resolves.not.toThrow();
    });
  });

  describe('Chrome storage 에러 처리', () => {
    it('chrome.runtime.lastError가 있으면 에러를 던져야 함', async () => {
      Object.defineProperty(chrome.runtime, 'lastError', {
        value: { message: 'Storage error' },
        configurable: true
      });

      mockStorage.get.mockImplementation(
        (
          _keys: string | string[] | null,
          callback: (result: Record<string, unknown>) => void
        ) => {
          callback({});
        }
      );

      await expect(repository.getAll()).rejects.toThrow('Storage error');

      Object.defineProperty(chrome.runtime, 'lastError', {
        value: null,
        configurable: true
      });
    });
  });
});
