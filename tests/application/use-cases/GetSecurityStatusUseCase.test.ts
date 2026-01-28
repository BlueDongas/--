/**
 * GetSecurityStatusUseCase 테스트
 */

import {
  GetSecurityStatusUseCase,
  GetSecurityStatusUseCaseDeps
} from '@application/use-cases/GetSecurityStatusUseCase';
import {
  createDetectionEvent,
  DetectionEvent
} from '@domain/entities/DetectionEvent';
import { NetworkRequestType } from '@domain/entities/NetworkRequest';
import {
  EventFilter,
  IEventRepository
} from '@domain/ports/IEventRepository';
import { ISettingsRepository } from '@domain/ports/ISettingsRepository';
import { Recommendation, Verdict } from '@domain/value-objects/Verdict';

/**
 * Mock EventRepository 생성
 */
function createMockEventRepository(
  events: DetectionEvent[] = []
): IEventRepository {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findByFilter: jest.fn().mockImplementation((filter: EventFilter) => {
      let result = events;
      if (filter.verdict !== undefined) {
        result = result.filter((e) => e.verdict === filter.verdict);
      }
      if (filter.fromTimestamp !== undefined) {
        const fromTs = filter.fromTimestamp;
        result = result.filter((e) => e.timestamp >= fromTs);
      }
      if (filter.limit !== undefined) {
        result = result.slice(0, filter.limit);
      }
      return Promise.resolve(result);
    }),
    findByDomain: jest.fn().mockResolvedValue([]),
    findRecent: jest.fn().mockImplementation((limit: number) =>
      Promise.resolve(events.slice(0, limit))
    ),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteOlderThan: jest.fn().mockResolvedValue(0),
    deleteAll: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(events.length),
    exportAll: jest.fn().mockResolvedValue([])
  };
}

/**
 * Mock SettingsRepository 생성
 */
function createMockSettingsRepository(
  overrides?: Partial<{
    isWhitelisted: boolean;
    aiEnabled: boolean;
  }>
): ISettingsRepository {
  const defaults = {
    isWhitelisted: false,
    aiEnabled: true,
    ...overrides
  };

  return {
    getAll: jest.fn().mockResolvedValue({
      aiAnalysisEnabled: defaults.aiEnabled,
      whitelistedDomains: [],
      notificationsEnabled: true,
      autoBlockEnabled: false,
      debugMode: false,
      dataRetentionHours: 24
    }),
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'aiAnalysisEnabled') {
        return Promise.resolve(defaults.aiEnabled);
      }
      return Promise.resolve(true);
    }),
    set: jest.fn().mockResolvedValue(undefined),
    setMultiple: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    isWhitelisted: jest.fn().mockResolvedValue(defaults.isWhitelisted),
    addToWhitelist: jest.fn().mockResolvedValue(undefined),
    removeFromWhitelist: jest.fn().mockResolvedValue(undefined)
  };
}

/**
 * 테스트용 DetectionEvent 생성
 */
function createTestEvent(
  verdict: Verdict,
  timestamp: number = Date.now()
): DetectionEvent {
  return createDetectionEvent({
    verdict,
    confidence: 0.9,
    reason: '테스트 이유',
    recommendation: Recommendation.WARN,
    matchedRuleId: 'D001',
    requestId: `req-${timestamp}`,
    requestType: NetworkRequestType.FETCH,
    targetDomain: 'api.example.com',
    currentDomain: 'shop.example.com',
    timestamp
  });
}

describe('GetSecurityStatusUseCase', () => {
  let useCase: GetSecurityStatusUseCase;
  let mockEventRepo: IEventRepository;
  let mockSettingsRepo: ISettingsRepository;

  beforeEach(() => {
    mockEventRepo = createMockEventRepository();
    mockSettingsRepo = createMockSettingsRepository();

    const deps: GetSecurityStatusUseCaseDeps = {
      eventRepository: mockEventRepo,
      settingsRepository: mockSettingsRepo
    };

    useCase = new GetSecurityStatusUseCase(deps);
  });

  describe('execute', () => {
    it('현재 도메인 정보를 반환해야 한다', async () => {
      const result = await useCase.execute('shop.example.com');

      expect(result.currentDomain).toBe('shop.example.com');
    });

    it('화이트리스트 상태를 반환해야 한다', async () => {
      (mockSettingsRepo.isWhitelisted as jest.Mock).mockResolvedValue(true);

      const result = await useCase.execute('trusted.com');

      expect(result.isWhitelisted).toBe(true);
    });

    it('AI 활성화 상태를 반환해야 한다', async () => {
      (mockSettingsRepo.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'aiAnalysisEnabled') {
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });

      const result = await useCase.execute('shop.example.com');

      expect(result.aiEnabled).toBe(false);
    });

    describe('상태 계산', () => {
      it('위험 이벤트가 있으면 danger 상태를 반환해야 한다', async () => {
        const events = [createTestEvent(Verdict.DANGEROUS)];
        mockEventRepo = createMockEventRepository(events);

        const deps: GetSecurityStatusUseCaseDeps = {
          eventRepository: mockEventRepo,
          settingsRepository: mockSettingsRepo
        };
        useCase = new GetSecurityStatusUseCase(deps);

        const result = await useCase.execute('shop.example.com');

        expect(result.overallStatus).toBe('danger');
        expect(result.recentDangerCount).toBe(1);
      });

      it('의심 이벤트만 있으면 warning 상태를 반환해야 한다', async () => {
        const events = [createTestEvent(Verdict.SUSPICIOUS)];
        mockEventRepo = createMockEventRepository(events);

        const deps: GetSecurityStatusUseCaseDeps = {
          eventRepository: mockEventRepo,
          settingsRepository: mockSettingsRepo
        };
        useCase = new GetSecurityStatusUseCase(deps);

        const result = await useCase.execute('shop.example.com');

        expect(result.overallStatus).toBe('warning');
        expect(result.recentSuspiciousCount).toBe(1);
      });

      it('안전 이벤트만 있으면 safe 상태를 반환해야 한다', async () => {
        const events = [createTestEvent(Verdict.SAFE)];
        mockEventRepo = createMockEventRepository(events);

        const deps: GetSecurityStatusUseCaseDeps = {
          eventRepository: mockEventRepo,
          settingsRepository: mockSettingsRepo
        };
        useCase = new GetSecurityStatusUseCase(deps);

        const result = await useCase.execute('shop.example.com');

        expect(result.overallStatus).toBe('safe');
      });

      it('이벤트가 없으면 safe 상태를 반환해야 한다', async () => {
        const result = await useCase.execute('shop.example.com');

        expect(result.overallStatus).toBe('safe');
        expect(result.totalEventCount).toBe(0);
      });
    });

    describe('이벤트 카운트', () => {
      it('총 이벤트 수를 반환해야 한다', async () => {
        const events = [
          createTestEvent(Verdict.DANGEROUS),
          createTestEvent(Verdict.SUSPICIOUS),
          createTestEvent(Verdict.SAFE)
        ];
        mockEventRepo = createMockEventRepository(events);

        const deps: GetSecurityStatusUseCaseDeps = {
          eventRepository: mockEventRepo,
          settingsRepository: mockSettingsRepo
        };
        useCase = new GetSecurityStatusUseCase(deps);

        const result = await useCase.execute('shop.example.com');

        expect(result.totalEventCount).toBe(3);
      });

      it('위험 이벤트 수를 정확히 계산해야 한다', async () => {
        const events = [
          createTestEvent(Verdict.DANGEROUS),
          createTestEvent(Verdict.DANGEROUS),
          createTestEvent(Verdict.SAFE)
        ];
        mockEventRepo = createMockEventRepository(events);

        const deps: GetSecurityStatusUseCaseDeps = {
          eventRepository: mockEventRepo,
          settingsRepository: mockSettingsRepo
        };
        useCase = new GetSecurityStatusUseCase(deps);

        const result = await useCase.execute('shop.example.com');

        expect(result.recentDangerCount).toBe(2);
      });

      it('의심 이벤트 수를 정확히 계산해야 한다', async () => {
        const events = [
          createTestEvent(Verdict.SUSPICIOUS),
          createTestEvent(Verdict.SUSPICIOUS),
          createTestEvent(Verdict.SUSPICIOUS)
        ];
        mockEventRepo = createMockEventRepository(events);

        const deps: GetSecurityStatusUseCaseDeps = {
          eventRepository: mockEventRepo,
          settingsRepository: mockSettingsRepo
        };
        useCase = new GetSecurityStatusUseCase(deps);

        const result = await useCase.execute('shop.example.com');

        expect(result.recentSuspiciousCount).toBe(3);
      });
    });

    describe('마지막 분석 시간', () => {
      it('이벤트가 있으면 마지막 분석 시간을 반환해야 한다', async () => {
        const now = Date.now();
        const events = [createTestEvent(Verdict.SAFE, now)];
        mockEventRepo = createMockEventRepository(events);

        const deps: GetSecurityStatusUseCaseDeps = {
          eventRepository: mockEventRepo,
          settingsRepository: mockSettingsRepo
        };
        useCase = new GetSecurityStatusUseCase(deps);

        const result = await useCase.execute('shop.example.com');

        expect(result.lastAnalysisTime).toBe(now);
      });

      it('이벤트가 없으면 마지막 분석 시간이 undefined여야 한다', async () => {
        const result = await useCase.execute('shop.example.com');

        expect(result.lastAnalysisTime).toBeUndefined();
      });
    });
  });
});
