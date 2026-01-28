/**
 * ManageSettingsUseCase 테스트
 */

import {
  SettingsUpdateDTO,
  WhitelistActionDTO
} from '@application/dto/AnalysisDTO';
import {
  ManageSettingsUseCase,
  ManageSettingsUseCaseDeps
} from '@application/use-cases/ManageSettingsUseCase';
import {
  DEFAULT_SETTINGS,
  ExtensionSettings,
  ISettingsRepository
} from '@domain/ports/ISettingsRepository';

/**
 * Mock SettingsRepository 생성
 */
function createMockSettingsRepository(
  initialSettings: ExtensionSettings = { ...DEFAULT_SETTINGS }
): ISettingsRepository {
  let settings = { ...initialSettings };

  return {
    getAll: jest.fn().mockImplementation(() => Promise.resolve({ ...settings })),
    get: jest.fn().mockImplementation(<K extends keyof ExtensionSettings>(key: K) =>
      Promise.resolve(settings[key])
    ),
    set: jest
      .fn()
      .mockImplementation(
        <K extends keyof ExtensionSettings>(
          key: K,
          value: ExtensionSettings[K]
        ) => {
          settings = { ...settings, [key]: value };
          return Promise.resolve();
        }
      ),
    setMultiple: jest
      .fn()
      .mockImplementation((updates: Partial<ExtensionSettings>) => {
        settings = { ...settings, ...updates };
        return Promise.resolve();
      }),
    reset: jest.fn().mockImplementation(() => {
      settings = { ...DEFAULT_SETTINGS };
      return Promise.resolve();
    }),
    isWhitelisted: jest.fn().mockImplementation((domain: string) =>
      Promise.resolve(settings.whitelistedDomains.includes(domain))
    ),
    addToWhitelist: jest.fn().mockImplementation((domain: string) => {
      if (!settings.whitelistedDomains.includes(domain)) {
        settings.whitelistedDomains = [...settings.whitelistedDomains, domain];
      }
      return Promise.resolve();
    }),
    removeFromWhitelist: jest.fn().mockImplementation((domain: string) => {
      settings.whitelistedDomains = settings.whitelistedDomains.filter(
        (d) => d !== domain
      );
      return Promise.resolve();
    })
  };
}

describe('ManageSettingsUseCase', () => {
  let useCase: ManageSettingsUseCase;
  let mockSettingsRepo: ISettingsRepository;

  beforeEach(() => {
    mockSettingsRepo = createMockSettingsRepository();

    const deps: ManageSettingsUseCaseDeps = {
      settingsRepository: mockSettingsRepo
    };

    useCase = new ManageSettingsUseCase(deps);
  });

  describe('getSettings', () => {
    it('모든 설정을 반환해야 한다', async () => {
      const result = await useCase.getSettings();

      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it('저장소의 설정을 조회해야 한다', async () => {
      await useCase.getSettings();

      expect(mockSettingsRepo.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSettings', () => {
    it('단일 설정을 업데이트해야 한다', async () => {
      const update: SettingsUpdateDTO = {
        aiAnalysisEnabled: false
      };

      await useCase.updateSettings(update);

      expect(mockSettingsRepo.setMultiple).toHaveBeenCalledWith({
        aiAnalysisEnabled: false
      });
    });

    it('여러 설정을 동시에 업데이트해야 한다', async () => {
      const update: SettingsUpdateDTO = {
        aiAnalysisEnabled: false,
        notificationsEnabled: false,
        autoBlockEnabled: true
      };

      await useCase.updateSettings(update);

      expect(mockSettingsRepo.setMultiple).toHaveBeenCalledWith({
        aiAnalysisEnabled: false,
        notificationsEnabled: false,
        autoBlockEnabled: true
      });
    });

    it('빈 업데이트도 처리해야 한다', async () => {
      const update: SettingsUpdateDTO = {};

      await useCase.updateSettings(update);

      expect(mockSettingsRepo.setMultiple).toHaveBeenCalledWith({});
    });

    it('dataRetentionHours를 업데이트해야 한다', async () => {
      const update: SettingsUpdateDTO = {
        dataRetentionHours: 48
      };

      await useCase.updateSettings(update);

      expect(mockSettingsRepo.setMultiple).toHaveBeenCalledWith({
        dataRetentionHours: 48
      });
    });
  });

  describe('resetSettings', () => {
    it('설정을 초기화해야 한다', async () => {
      await useCase.resetSettings();

      expect(mockSettingsRepo.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('manageWhitelist', () => {
    it('도메인을 화이트리스트에 추가해야 한다', async () => {
      const action: WhitelistActionDTO = {
        action: 'add',
        domain: 'trusted.com'
      };

      await useCase.manageWhitelist(action);

      expect(mockSettingsRepo.addToWhitelist).toHaveBeenCalledWith('trusted.com');
    });

    it('도메인을 화이트리스트에서 제거해야 한다', async () => {
      const action: WhitelistActionDTO = {
        action: 'remove',
        domain: 'untrusted.com'
      };

      await useCase.manageWhitelist(action);

      expect(mockSettingsRepo.removeFromWhitelist).toHaveBeenCalledWith(
        'untrusted.com'
      );
    });
  });

  describe('isWhitelisted', () => {
    it('화이트리스트 여부를 확인해야 한다', async () => {
      const result = await useCase.isWhitelisted('example.com');

      expect(mockSettingsRepo.isWhitelisted).toHaveBeenCalledWith('example.com');
      expect(result).toBe(false);
    });

    it('화이트리스트에 있는 도메인은 true를 반환해야 한다', async () => {
      mockSettingsRepo = createMockSettingsRepository({
        ...DEFAULT_SETTINGS,
        whitelistedDomains: ['trusted.com']
      });

      const deps: ManageSettingsUseCaseDeps = {
        settingsRepository: mockSettingsRepo
      };
      useCase = new ManageSettingsUseCase(deps);

      const result = await useCase.isWhitelisted('trusted.com');

      expect(result).toBe(true);
    });
  });

  describe('getWhitelistedDomains', () => {
    it('화이트리스트 도메인 목록을 반환해야 한다', async () => {
      mockSettingsRepo = createMockSettingsRepository({
        ...DEFAULT_SETTINGS,
        whitelistedDomains: ['a.com', 'b.com', 'c.com']
      });

      const deps: ManageSettingsUseCaseDeps = {
        settingsRepository: mockSettingsRepo
      };
      useCase = new ManageSettingsUseCase(deps);

      const result = await useCase.getWhitelistedDomains();

      expect(result).toEqual(['a.com', 'b.com', 'c.com']);
    });

    it('빈 화이트리스트를 처리해야 한다', async () => {
      const result = await useCase.getWhitelistedDomains();

      expect(result).toEqual([]);
    });
  });
});
