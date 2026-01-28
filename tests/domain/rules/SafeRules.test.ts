/**
 * 안전 규칙 (Safe Rules) S001-S003 테스트
 */

import {
  DetectionRule,
  RuleCategory
} from '@domain/entities/DetectionRule';
import {
  createNetworkRequest,
  NetworkRequestType
} from '@domain/entities/NetworkRequest';
import { createSensitiveInput } from '@domain/entities/SensitiveInput';
import { DetectionContext } from '@domain/ports/IDetectionEngine';
import {
  createS001Rule,
  createS002Rule,
  createS003Rule
} from '@domain/rules/SafeRules';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';

/**
 * 테스트용 컨텍스트 생성 헬퍼
 */
function createTestContext(overrides: {
  domain?: string;
  currentDomain?: string;
  timestamp?: number;
  recentInputTimestamp?: number;
  requestType?: NetworkRequestType;
  fieldType?: SensitiveFieldType;
  payloadSize?: number;
  hasRecentInputs?: boolean;
}): DetectionContext {
  const now = Date.now();
  const config = {
    domain: 'api.example.com',
    currentDomain: 'shop.example.com',
    timestamp: now,
    recentInputTimestamp: now - 200,
    requestType: NetworkRequestType.FETCH,
    fieldType: SensitiveFieldType.CARD_NUMBER,
    payloadSize: 256,
    hasRecentInputs: true,
    ...overrides
  };

  const recentInputs = config.hasRecentInputs
    ? [
        createSensitiveInput({
          fieldId: 'test-field',
          fieldType: config.fieldType,
          inputLength: 16,
          timestamp: config.recentInputTimestamp,
          domPath: 'form > input'
        })
      ]
    : [];

  return {
    request: createNetworkRequest({
      type: config.requestType,
      url: `https://${config.domain}/api/data`,
      method: 'POST',
      payloadSize: config.payloadSize,
      timestamp: config.timestamp
    }),
    recentInputs,
    currentDomain: config.currentDomain
  };
}

describe('S001: Known Payment Gateway', () => {
  let rule: DetectionRule;

  beforeEach(() => {
    rule = createS001Rule();
  });

  it('규칙이 올바른 속성을 가져야 한다', () => {
    expect(rule.id).toBe('S001');
    expect(rule.name).toBe('known_payment_gateway');
    expect(rule.category).toBe(RuleCategory.SAFE);
    expect(rule.priority).toBe(100);
    expect(rule.enabled).toBe(true);
  });

  describe('글로벌 결제 게이트웨이', () => {
    it('Stripe로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'api.stripe.com'
      });

      const result = rule.check(context);

      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.details?.gateway).toBe('Stripe');
    });

    it('js.stripe.com도 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'js.stripe.com'
      });

      const result = rule.check(context);
      expect(result.match).toBe(true);
    });

    it('PayPal로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'www.paypal.com'
      });

      const result = rule.check(context);

      expect(result.match).toBe(true);
      expect(result.details?.gateway).toBe('PayPal');
    });

    it('Braintree로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'api.braintreegateway.com'
      });

      const result = rule.check(context);

      expect(result.match).toBe(true);
      expect(result.details?.gateway).toBe('Braintree');
    });

    it('Square로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'connect.squareup.com'
      });

      const result = rule.check(context);
      expect(result.match).toBe(true);
    });

    it('Checkout.com으로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'api.checkout.com'
      });

      const result = rule.check(context);
      expect(result.match).toBe(true);
    });

    it('Adyen으로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'checkout.adyen.com'
      });

      const result = rule.check(context);
      expect(result.match).toBe(true);
    });
  });

  describe('한국 결제 게이트웨이', () => {
    it('이니시스로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'inilite.inicis.com'
      });

      const result = rule.check(context);

      expect(result.match).toBe(true);
      expect(result.details?.gateway).toBe('이니시스');
    });

    it('토스페이먼츠로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'api.tosspayments.com'
      });

      const result = rule.check(context);

      expect(result.match).toBe(true);
      expect(result.details?.gateway).toBe('토스페이먼츠');
    });

    it('카카오페이로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'kapi.kakaopay.com'
      });

      const result = rule.check(context);
      expect(result.match).toBe(true);
    });

    it('네이버페이로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'pay.naverpay.com'
      });

      const result = rule.check(context);
      expect(result.match).toBe(true);
    });

    it('나이스페이로 전송 시 안전으로 판단해야 한다', () => {
      const context = createTestContext({
        domain: 'web.nicepay.co.kr'
      });

      const result = rule.check(context);
      expect(result.match).toBe(true);
    });
  });

  it('알 수 없는 도메인은 매칭되지 않아야 한다', () => {
    const context = createTestContext({
      domain: 'unknown-payment.com'
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('위장된 결제 게이트웨이 도메인은 매칭되지 않아야 한다', () => {
    const context = createTestContext({
      domain: 'stripe-api.net' // 위장된 도메인
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });
});

describe('S002: Same Domain Transfer', () => {
  let rule: DetectionRule;

  beforeEach(() => {
    rule = createS002Rule();
  });

  it('규칙이 올바른 속성을 가져야 한다', () => {
    expect(rule.id).toBe('S002');
    expect(rule.name).toBe('same_domain_transfer');
    expect(rule.category).toBe(RuleCategory.SAFE);
    expect(rule.priority).toBe(95);
    expect(rule.enabled).toBe(true);
  });

  it('정확히 동일한 도메인으로 전송 시 높은 신뢰도로 안전 판단해야 한다', () => {
    const context = createTestContext({
      domain: 'shop.example.com',
      currentDomain: 'shop.example.com'
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(0.95);
    expect(result.details?.relationship).toBe('exact_match');
  });

  it('서브도메인으로 전송 시 안전 판단해야 한다', () => {
    const context = createTestContext({
      domain: 'api.shop.example.com',
      currentDomain: 'shop.example.com'
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(result.details?.relationship).toBe('subdomain');
  });

  it('부모 도메인으로 전송 시 안전 판단해야 한다', () => {
    const context = createTestContext({
      domain: 'example.com',
      currentDomain: 'shop.example.com'
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(result.details?.relationship).toBe('subdomain');
  });

  it('동일 루트 도메인으로 전송 시 안전 판단해야 한다', () => {
    const context = createTestContext({
      domain: 'api.example.com',
      currentDomain: 'www.example.com'
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(0.85);
    expect(result.details?.relationship).toBe('same_root');
    expect(result.details?.rootDomain).toBe('example.com');
  });

  it('다른 도메인으로 전송 시 매칭되지 않아야 한다', () => {
    const context = createTestContext({
      domain: 'external.com',
      currentDomain: 'shop.example.com'
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('유사하지만 다른 도메인은 매칭되지 않아야 한다', () => {
    const context = createTestContext({
      domain: 'shop-example.com',
      currentDomain: 'shop.example.com'
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('TLD만 다른 도메인은 매칭되지 않아야 한다', () => {
    const context = createTestContext({
      domain: 'example.net',
      currentDomain: 'example.com'
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });
});

describe('S003: Analytics No Sensitive', () => {
  let rule: DetectionRule;

  beforeEach(() => {
    rule = createS003Rule();
  });

  it('규칙이 올바른 속성을 가져야 한다', () => {
    expect(rule.id).toBe('S003');
    expect(rule.name).toBe('analytics_no_sensitive');
    expect(rule.category).toBe(RuleCategory.SAFE);
    expect(rule.priority).toBe(80);
    expect(rule.enabled).toBe(true);
  });

  it('Google Analytics로 전송 시 민감 정보 없으면 안전 판단해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'www.google-analytics.com',
      timestamp: now,
      recentInputTimestamp: now - 5000, // 5초 전 (1초 이상)
      fieldType: SensitiveFieldType.EMAIL // 비민감
    });

    const result = rule.check(context);

    expect(result.match).toBe(true);
    expect(result.confidence).toBe(0.85);
    expect(result.details?.reason).toBe('no_recent_sensitive_input');
  });

  it('Mixpanel로 전송 시 민감 정보 없으면 안전 판단해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'api.mixpanel.com',
      timestamp: now,
      recentInputTimestamp: now - 2000,
      fieldType: SensitiveFieldType.PHONE
    });

    const result = rule.check(context);
    expect(result.match).toBe(true);
  });

  it('Hotjar로 전송 시 민감 정보 없으면 안전 판단해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'in.hotjar.com',
      timestamp: now,
      recentInputTimestamp: now - 2000,
      fieldType: SensitiveFieldType.EMAIL
    });

    const result = rule.check(context);
    expect(result.match).toBe(true);
  });

  it('민감 정보 입력이 없으면 안전 판단해야 한다', () => {
    const now = Date.now();
    const context: DetectionContext = {
      request: createNetworkRequest({
        type: NetworkRequestType.FETCH,
        url: 'https://www.google-analytics.com/collect',
        method: 'POST',
        payloadSize: 128,
        timestamp: now
      }),
      recentInputs: [],
      currentDomain: 'shop.example.com'
    };

    const result = rule.check(context);
    expect(result.match).toBe(true);
  });

  it('분석 서비스가 아닌 도메인은 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'api.example.com',
      timestamp: now,
      recentInputTimestamp: now - 2000,
      fieldType: SensitiveFieldType.EMAIL
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('최근 카드 정보 입력이 있으면 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'www.google-analytics.com',
      timestamp: now,
      recentInputTimestamp: now - 500, // 500ms 전 (1초 이내)
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('최근 CVV 입력이 있으면 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'api.segment.com',
      timestamp: now,
      recentInputTimestamp: now - 500,
      fieldType: SensitiveFieldType.CVV
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('최근 비밀번호 입력이 있으면 매칭되지 않아야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'analytics.amplitude.com',
      timestamp: now,
      recentInputTimestamp: now - 800,
      fieldType: SensitiveFieldType.PASSWORD
    });

    const result = rule.check(context);
    expect(result.match).toBe(false);
  });

  it('1초 이상 경과한 카드 입력은 무시해야 한다', () => {
    const now = Date.now();
    const context = createTestContext({
      domain: 'www.google-analytics.com',
      timestamp: now,
      recentInputTimestamp: now - 1500, // 1.5초 전
      fieldType: SensitiveFieldType.CARD_NUMBER
    });

    const result = rule.check(context);
    expect(result.match).toBe(true);
  });
});
