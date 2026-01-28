/**
 * AnalyzeNetworkRequestUseCase 테스트
 */

import { AnalysisRequestDTO } from '@application/dto/AnalysisDTO';
import {
  AnalyzeNetworkRequestUseCase,
  AnalyzeNetworkRequestUseCaseDeps
} from '@application/use-cases/AnalyzeNetworkRequestUseCase';
import { NetworkRequestType } from '@domain/entities/NetworkRequest';
import { IAIAnalyzer } from '@domain/ports/IAIAnalyzer';
import {
  DetectionContext,
  IDetectionEngine
} from '@domain/ports/IDetectionEngine';
import {
  ExtensionSettings,
  ISettingsRepository
} from '@domain/ports/ISettingsRepository';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';
import { Recommendation, Verdict } from '@domain/value-objects/Verdict';

/**
 * Mock HeuristicEngine 생성
 */
function createMockHeuristicEngine(
  overrides?: Partial<IDetectionEngine>
): IDetectionEngine {
  return {
    analyze: jest.fn().mockReturnValue({
      verdict: Verdict.UNKNOWN,
      confidence: 0,
      matchedRules: [],
      reason: '매칭된 규칙 없음'
    }),
    registerRule: jest.fn(),
    unregisterRule: jest.fn(),
    getRules: jest.fn().mockReturnValue([]),
    setRuleEnabled: jest.fn(),
    ...overrides
  };
}

/**
 * Mock AI Analyzer 생성
 */
function createMockAIAnalyzer(
  overrides?: Partial<IAIAnalyzer>
): IAIAnalyzer {
  return {
    analyze: jest.fn().mockResolvedValue({
      verdict: Verdict.SAFE,
      confidence: 0.85,
      reason: 'AI 분석 결과 안전',
      recommendation: Recommendation.PROCEED
    }),
    isAvailable: jest.fn().mockResolvedValue(true),
    isEnabled: jest.fn().mockReturnValue(true),
    setEnabled: jest.fn(),
    ...overrides
  };
}

/**
 * Mock Settings Repository 생성
 */
function createMockSettingsRepository(
  overrides?: Partial<ISettingsRepository>
): ISettingsRepository {
  const defaultSettings: ExtensionSettings = {
    aiAnalysisEnabled: true,
    whitelistedDomains: [],
    notificationsEnabled: true,
    autoBlockEnabled: false,
    debugMode: false,
    dataRetentionHours: 24
  };

  return {
    getAll: jest.fn().mockResolvedValue(defaultSettings),
    get: jest.fn().mockImplementation((key: keyof ExtensionSettings) =>
      Promise.resolve(defaultSettings[key])
    ),
    set: jest.fn().mockResolvedValue(undefined),
    setMultiple: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    isWhitelisted: jest.fn().mockResolvedValue(false),
    addToWhitelist: jest.fn().mockResolvedValue(undefined),
    removeFromWhitelist: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

/**
 * 테스트용 분석 요청 생성
 */
function createTestRequest(
  overrides?: Partial<AnalysisRequestDTO>
): AnalysisRequestDTO {
  const now = Date.now();
  return {
    request: {
      type: NetworkRequestType.FETCH,
      url: 'https://api.example.com/data',
      method: 'POST',
      payloadSize: 256,
      timestamp: now
    },
    recentInputs: [
      {
        fieldType: SensitiveFieldType.CARD_NUMBER,
        inputLength: 16,
        timestamp: now - 200
      }
    ],
    currentDomain: 'shop.example.com',
    ...overrides
  };
}

describe('AnalyzeNetworkRequestUseCase', () => {
  let useCase: AnalyzeNetworkRequestUseCase;
  let mockEngine: IDetectionEngine;
  let mockAIAnalyzer: IAIAnalyzer;
  let mockSettingsRepo: ISettingsRepository;

  beforeEach(() => {
    mockEngine = createMockHeuristicEngine();
    mockAIAnalyzer = createMockAIAnalyzer();
    mockSettingsRepo = createMockSettingsRepository();

    const deps: AnalyzeNetworkRequestUseCaseDeps = {
      heuristicEngine: mockEngine,
      aiAnalyzer: mockAIAnalyzer,
      settingsRepository: mockSettingsRepo
    };

    useCase = new AnalyzeNetworkRequestUseCase(deps);
  });

  describe('execute', () => {
    it('휴리스틱 엔진을 사용하여 분석해야 한다', async () => {
      const request = createTestRequest();

      await useCase.execute(request);

      expect(mockEngine.analyze).toHaveBeenCalledTimes(1);
      expect(mockEngine.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          currentDomain: 'shop.example.com'
        })
      );
    });

    it('휴리스틱이 DANGEROUS를 반환하면 AI를 호출하지 않아야 한다', async () => {
      (mockEngine.analyze as jest.Mock).mockReturnValue({
        verdict: Verdict.DANGEROUS,
        confidence: 0.95,
        matchedRules: [
          {
            ruleId: 'D001',
            ruleName: 'test_rule',
            checkResult: { match: true, confidence: 0.95 }
          }
        ],
        reason: '위험 규칙 매칭'
      });

      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      expect(result.usedAI).toBe(false);
      expect(mockAIAnalyzer.analyze).not.toHaveBeenCalled();
    });

    it('휴리스틱이 SAFE를 반환하면 AI를 호출하지 않아야 한다', async () => {
      (mockEngine.analyze as jest.Mock).mockReturnValue({
        verdict: Verdict.SAFE,
        confidence: 0.95,
        matchedRules: [
          {
            ruleId: 'S001',
            ruleName: 'safe_rule',
            checkResult: { match: true, confidence: 0.95 }
          }
        ],
        reason: '안전 규칙 매칭'
      });

      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(result.verdict).toBe(Verdict.SAFE);
      expect(result.usedAI).toBe(false);
      expect(mockAIAnalyzer.analyze).not.toHaveBeenCalled();
    });

    it('휴리스틱이 UNKNOWN이고 AI가 활성화되면 AI를 호출해야 한다', async () => {
      (mockEngine.analyze as jest.Mock).mockReturnValue({
        verdict: Verdict.UNKNOWN,
        confidence: 0,
        matchedRules: [],
        reason: '매칭된 규칙 없음'
      });

      (mockAIAnalyzer.analyze as jest.Mock).mockResolvedValue({
        verdict: Verdict.SUSPICIOUS,
        confidence: 0.75,
        reason: 'AI 분석 결과 의심스러움',
        recommendation: Recommendation.WARN
      });

      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(mockAIAnalyzer.analyze).toHaveBeenCalledTimes(1);
      expect(result.verdict).toBe(Verdict.SUSPICIOUS);
      expect(result.usedAI).toBe(true);
    });

    it('휴리스틱이 UNKNOWN이지만 AI가 비활성화되면 UNKNOWN을 반환해야 한다', async () => {
      (mockSettingsRepo.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'aiAnalysisEnabled') return Promise.resolve(false);
        return Promise.resolve(true);
      });

      (mockEngine.analyze as jest.Mock).mockReturnValue({
        verdict: Verdict.UNKNOWN,
        confidence: 0,
        matchedRules: [],
        reason: '매칭된 규칙 없음'
      });

      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(mockAIAnalyzer.analyze).not.toHaveBeenCalled();
      expect(result.verdict).toBe(Verdict.UNKNOWN);
      expect(result.usedAI).toBe(false);
    });

    it('화이트리스트 도메인은 SAFE로 판단해야 한다', async () => {
      (mockSettingsRepo.isWhitelisted as jest.Mock).mockResolvedValue(true);

      const request = createTestRequest({
        request: {
          type: NetworkRequestType.FETCH,
          url: 'https://trusted-domain.com/api',
          method: 'POST',
          payloadSize: 256,
          timestamp: Date.now()
        }
      });

      const result = await useCase.execute(request);

      expect(result.verdict).toBe(Verdict.SAFE);
      expect(result.reason).toContain('화이트리스트');
      expect(mockEngine.analyze).not.toHaveBeenCalled();
    });

    it('올바른 recommendation을 반환해야 한다', async () => {
      (mockEngine.analyze as jest.Mock).mockReturnValue({
        verdict: Verdict.DANGEROUS,
        confidence: 0.95,
        matchedRules: [],
        reason: '위험'
      });

      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(result.recommendation).toBe(Recommendation.BLOCK);
    });

    it('매칭된 규칙 ID를 반환해야 한다', async () => {
      (mockEngine.analyze as jest.Mock).mockReturnValue({
        verdict: Verdict.DANGEROUS,
        confidence: 0.95,
        matchedRules: [
          {
            ruleId: 'D001',
            ruleName: 'rule1',
            checkResult: { match: true, confidence: 0.95 }
          },
          {
            ruleId: 'D002',
            ruleName: 'rule2',
            checkResult: { match: true, confidence: 0.9 }
          }
        ],
        reason: '위험'
      });

      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(result.matchedRuleIds).toEqual(['D001', 'D002']);
    });

    it('분석 시간을 측정해야 한다', async () => {
      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(result.analysisTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('AI 분석 실패 시 UNKNOWN으로 폴백해야 한다', async () => {
      (mockEngine.analyze as jest.Mock).mockReturnValue({
        verdict: Verdict.UNKNOWN,
        confidence: 0,
        matchedRules: [],
        reason: '매칭된 규칙 없음'
      });

      (mockAIAnalyzer.analyze as jest.Mock).mockRejectedValue(
        new Error('AI 분석 실패')
      );

      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(result.verdict).toBe(Verdict.UNKNOWN);
      expect(result.usedAI).toBe(false);
    });

    it('AI가 사용 불가능하면 휴리스틱 결과만 사용해야 한다', async () => {
      (mockEngine.analyze as jest.Mock).mockReturnValue({
        verdict: Verdict.UNKNOWN,
        confidence: 0,
        matchedRules: [],
        reason: '매칭된 규칙 없음'
      });

      (mockAIAnalyzer.isAvailable as jest.Mock).mockResolvedValue(false);

      const request = createTestRequest();
      const result = await useCase.execute(request);

      expect(mockAIAnalyzer.analyze).not.toHaveBeenCalled();
      expect(result.verdict).toBe(Verdict.UNKNOWN);
    });
  });

  describe('DTO 변환', () => {
    it('AnalysisRequestDTO를 DetectionContext로 변환해야 한다', async () => {
      const request = createTestRequest();

      await useCase.execute(request);

      const analyzeCalls = (mockEngine.analyze as jest.Mock).mock.calls;
      const context = analyzeCalls[0][0] as DetectionContext;

      expect(context.request.url).toBe(request.request.url);
      expect(context.currentDomain).toBe(request.currentDomain);
      expect(context.recentInputs).toHaveLength(1);
    });
  });
});
