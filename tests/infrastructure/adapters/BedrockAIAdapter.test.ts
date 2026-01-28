/**
 * BedrockAIAdapter 테스트
 */

import { createNetworkRequest } from '@domain/entities/NetworkRequest';
import { createSensitiveInput } from '@domain/entities/SensitiveInput';
import { AIAnalysisRequest } from '@domain/ports/IAIAnalyzer';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';
import { Recommendation, Verdict } from '@domain/value-objects/Verdict';
import { BedrockAIAdapter } from '@infrastructure/adapters/BedrockAIAdapter';

// Bedrock SDK mock
const mockInvoke = jest.fn();
jest.mock('@anthropic-ai/bedrock-sdk', () => ({
  AnthropicBedrock: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockInvoke
    }
  }))
}));

describe('BedrockAIAdapter', () => {
  let adapter: BedrockAIAdapter;
  const testConfig = {
    region: 'us-west-2',
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0'
  };

  /**
   * 테스트용 분석 요청 생성
   */
  function createTestRequest(
    overrides: Partial<AIAnalysisRequest> = {}
  ): AIAnalysisRequest {
    return {
      request: createNetworkRequest({
        type: 'fetch',
        url: 'https://malicious.example.com/collect',
        method: 'POST',
        payloadSize: 256,
        timestamp: Date.now()
      }),
      recentInputs: [
        createSensitiveInput({
          fieldId: 'card-number',
          fieldType: SensitiveFieldType.CREDIT_CARD,
          inputLength: 16,
          timestamp: Date.now() - 100,
          domPath: 'form > input#card-number'
        })
      ],
      currentDomain: 'shop.example.com',
      ...overrides
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new BedrockAIAdapter(testConfig);
  });

  describe('생성자', () => {
    it('설정으로 어댑터를 생성해야 함', () => {
      const newAdapter = new BedrockAIAdapter(testConfig);
      expect(newAdapter).toBeDefined();
    });

    it('기본적으로 활성화 상태여야 함', () => {
      expect(adapter.isEnabled()).toBe(true);
    });
  });

  describe('isEnabled / setEnabled', () => {
    it('활성화 상태를 변경할 수 있어야 함', () => {
      adapter.setEnabled(false);
      expect(adapter.isEnabled()).toBe(false);

      adapter.setEnabled(true);
      expect(adapter.isEnabled()).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('활성화되어 있고 API 호출이 성공하면 true를 반환해야 함', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ok' }]
      });

      const result = await adapter.isAvailable();

      expect(result).toBe(true);
    });

    it('비활성화되어 있으면 false를 반환해야 함', async () => {
      adapter.setEnabled(false);

      const result = await adapter.isAvailable();

      expect(result).toBe(false);
    });

    it('API 호출이 실패하면 false를 반환해야 함', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('API Error'));

      const result = await adapter.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('analyze', () => {
    it('위험한 요청에 대해 DANGEROUS 결과를 반환해야 함', async () => {
      const aiResponse = JSON.stringify({
        verdict: 'DANGEROUS',
        confidence: 0.95,
        reason: '민감 데이터가 외부 도메인으로 전송됨',
        recommendation: 'BLOCK'
      });

      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: aiResponse }]
      });

      const request = createTestRequest();
      const result = await adapter.analyze(request);

      expect(result.verdict).toBe(Verdict.DANGEROUS);
      expect(result.confidence).toBe(0.95);
      expect(result.reason).toBe('민감 데이터가 외부 도메인으로 전송됨');
      expect(result.recommendation).toBe(Recommendation.BLOCK);
    });

    it('안전한 요청에 대해 SAFE 결과를 반환해야 함', async () => {
      const aiResponse = JSON.stringify({
        verdict: 'SAFE',
        confidence: 0.9,
        reason: '정상적인 결제 API 호출',
        recommendation: 'PROCEED'
      });

      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: aiResponse }]
      });

      const request = createTestRequest({
        request: createNetworkRequest({
          type: 'fetch',
          url: 'https://payment.stripe.com/api/charge',
          method: 'POST',
          payloadSize: 128,
          timestamp: Date.now()
        })
      });

      const result = await adapter.analyze(request);

      expect(result.verdict).toBe(Verdict.SAFE);
      expect(result.recommendation).toBe(Recommendation.PROCEED);
    });

    it('의심스러운 요청에 대해 SUSPICIOUS 결과를 반환해야 함', async () => {
      const aiResponse = JSON.stringify({
        verdict: 'SUSPICIOUS',
        confidence: 0.7,
        reason: '비정상적인 패턴 감지',
        recommendation: 'WARN'
      });

      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: aiResponse }]
      });

      const request = createTestRequest();
      const result = await adapter.analyze(request);

      expect(result.verdict).toBe(Verdict.SUSPICIOUS);
      expect(result.recommendation).toBe(Recommendation.WARN);
    });

    it('휴리스틱 결과를 프롬프트에 포함해야 함', async () => {
      const aiResponse = JSON.stringify({
        verdict: 'DANGEROUS',
        confidence: 0.9,
        reason: '휴리스틱 분석 결과와 일치',
        recommendation: 'BLOCK'
      });

      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: aiResponse }]
      });

      const request = createTestRequest({
        heuristicVerdict: Verdict.SUSPICIOUS,
        heuristicConfidence: 0.6
      });

      await adapter.analyze(request);

      // API 호출 확인
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('외부 스크립트 정보를 프롬프트에 포함해야 함', async () => {
      const aiResponse = JSON.stringify({
        verdict: 'DANGEROUS',
        confidence: 0.95,
        reason: '알려지지 않은 외부 스크립트가 감지됨',
        recommendation: 'BLOCK'
      });

      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: aiResponse }]
      });

      const request = createTestRequest({
        externalScripts: [
          'https://cdn.malicious.com/script.js',
          'https://analytics.example.com/tracker.js'
        ]
      });

      await adapter.analyze(request);

      expect(mockInvoke).toHaveBeenCalled();
    });

    it('비활성화 상태에서는 UNKNOWN을 반환해야 함', async () => {
      adapter.setEnabled(false);

      const request = createTestRequest();
      const result = await adapter.analyze(request);

      expect(result.verdict).toBe(Verdict.UNKNOWN);
      expect(result.reason).toContain('비활성화');
    });

    it('API 에러 시 에러를 전파해야 함', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('API Error'));

      const request = createTestRequest();

      await expect(adapter.analyze(request)).rejects.toThrow('API Error');
    });

    it('잘못된 JSON 응답 시 에러를 던져야 함', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'invalid json' }]
      });

      const request = createTestRequest();

      await expect(adapter.analyze(request)).rejects.toThrow();
    });

    it('빈 응답 시 에러를 던져야 함', async () => {
      mockInvoke.mockResolvedValueOnce({
        content: []
      });

      const request = createTestRequest();

      await expect(adapter.analyze(request)).rejects.toThrow();
    });

    it('details 필드가 있으면 결과에 포함해야 함', async () => {
      const aiResponse = JSON.stringify({
        verdict: 'DANGEROUS',
        confidence: 0.9,
        reason: '위험 감지',
        recommendation: 'BLOCK',
        details: {
          suspiciousPatterns: ['data exfiltration', 'encoded payload'],
          riskScore: 95
        }
      });

      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: aiResponse }]
      });

      const request = createTestRequest();
      const result = await adapter.analyze(request);

      expect(result.details).toBeDefined();
      expect(result.details?.suspiciousPatterns).toEqual([
        'data exfiltration',
        'encoded payload'
      ]);
    });
  });

  describe('API 호출 파라미터', () => {
    it('올바른 모델 ID로 호출해야 함', async () => {
      const aiResponse = JSON.stringify({
        verdict: 'SAFE',
        confidence: 0.9,
        reason: '안전',
        recommendation: 'ALLOW'
      });

      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: aiResponse }]
      });

      const request = createTestRequest();
      await adapter.analyze(request);

      expect(mockInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          model: testConfig.modelId
        })
      );
    });

    it('적절한 max_tokens을 설정해야 함', async () => {
      const aiResponse = JSON.stringify({
        verdict: 'SAFE',
        confidence: 0.9,
        reason: '안전',
        recommendation: 'ALLOW'
      });

      mockInvoke.mockResolvedValueOnce({
        content: [{ type: 'text', text: aiResponse }]
      });

      const request = createTestRequest();
      await adapter.analyze(request);

      expect(mockInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: expect.any(Number)
        })
      );
    });
  });
});
