/**
 * ============================================================================
 * 파일: SafeRules.ts
 * ============================================================================
 *
 * [역할]
 * "안전한" 네트워크 요청 패턴을 식별하는 휴리스틱 규칙들을 정의합니다.
 * 이 규칙에 매칭되면 해당 요청은 SAFE로 판정됩니다.
 *
 * [비유]
 * "신뢰할 수 있는 업체 목록"과 같습니다:
 * - 이 목록에 있는 곳으로 데이터를 보내면 안전하다고 판단
 *
 * [정의된 규칙들]
 *
 * S001: known_payment_gateway (우선순위 100)
 * - 알려진 신뢰 가능한 결제 게이트웨이로의 전송
 * - 예: stripe.com, paypal.com, 토스페이먼츠, 카카오페이 등
 * - 신뢰도: 0.95
 *
 * S002: same_domain_transfer (우선순위 95)
 * - 현재 페이지와 동일한 도메인으로의 전송
 * - 정확히 같은 도메인, 서브도메인, 같은 루트 도메인 모두 체크
 * - 예: shop.example.com → api.example.com (같은 루트)
 * - 신뢰도: 0.85~0.95
 *
 * S003: analytics_no_sensitive (우선순위 80)
 * - 분석 서비스(Google Analytics 등)로의 전송이지만
 *   최근 1초 이내에 고민감도 입력(카드, 비밀번호)이 없는 경우
 * - 예: Google Analytics로 페이지뷰 전송 (민감 데이터 없음)
 * - 신뢰도: 0.85
 *
 * [왜 안전 규칙이 필요한가?]
 * - 정상적인 요청까지 모두 경고하면 사용자가 피로해짐
 * - 명확히 안전한 패턴은 빨리 통과시켜 성능 향상
 *
 * [다른 파일과의 관계]
 * - HeuristicEngine.ts: 이 규칙들을 등록하고 실행
 * - RuleRegistry.ts: 규칙 관리
 * - DangerRules.ts: 반대로 위험 패턴 정의
 *
 * [흐름]
 * HeuristicEngine.analyze() → 위험 규칙 먼저 체크 → 매칭 없으면
 * → 안전 규칙 체크 → S001/S002/S003 중 하나 매칭 시 SAFE 반환
 * ============================================================================
 */

import {
  createDetectionRule,
  DetectionRule,
  RuleCategory
} from '@domain/entities/DetectionRule';
import { DetectionContext } from '@domain/ports/IDetectionEngine';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';

/**
 * 신뢰할 수 있는 결제 게이트웨이 정의
 */
interface TrustedPaymentGateway {
  domain: string;
  name: string;
}

const TRUSTED_PAYMENT_GATEWAYS: readonly TrustedPaymentGateway[] = [
  // 글로벌
  { domain: 'stripe.com', name: 'Stripe' },
  { domain: 'js.stripe.com', name: 'Stripe JS' },
  { domain: 'api.stripe.com', name: 'Stripe API' },
  { domain: 'paypal.com', name: 'PayPal' },
  { domain: 'paypalobjects.com', name: 'PayPal Objects' },
  { domain: 'braintreegateway.com', name: 'Braintree' },
  { domain: 'braintree-api.com', name: 'Braintree API' },
  { domain: 'square.com', name: 'Square' },
  { domain: 'squareup.com', name: 'Square' },
  { domain: 'checkout.com', name: 'Checkout.com' },
  { domain: 'adyen.com', name: 'Adyen' },
  { domain: 'worldpay.com', name: 'Worldpay' },
  { domain: 'authorize.net', name: 'Authorize.Net' },
  { domain: '2checkout.com', name: '2Checkout' },

  // 한국
  { domain: 'inicis.com', name: '이니시스' },
  { domain: 'tosspayments.com', name: '토스페이먼츠' },
  { domain: 'kakaopay.com', name: '카카오페이' },
  { domain: 'naverpay.com', name: '네이버페이' },
  { domain: 'nicepay.co.kr', name: '나이스페이' },
  { domain: 'kcp.co.kr', name: 'KCP' },
  { domain: 'payco.com', name: '페이코' }
];

/**
 * S001: 알려진 결제 게이트웨이
 * 알려진 신뢰 가능한 결제 게이트웨이로의 전송
 */
export function createS001Rule(): DetectionRule {
  return createDetectionRule({
    id: 'S001',
    name: 'known_payment_gateway',
    description: '알려진 신뢰 가능한 결제 게이트웨이로의 전송',
    category: RuleCategory.SAFE,
    priority: 100,
    enabled: true,
    tags: ['payment', 'trusted'],

    check: (contextUnknown) => {
      const context = contextUnknown as DetectionContext;
      const { request } = context;

      const matchedGateway = TRUSTED_PAYMENT_GATEWAYS.find(
        (gw) =>
          request.domain.includes(gw.domain) ||
          request.domain.endsWith(`.${gw.domain}`)
      );

      if (matchedGateway !== undefined) {
        return {
          match: true,
          confidence: 0.95,
          details: {
            gateway: matchedGateway.name,
            domain: request.domain
          }
        };
      }

      return { match: false, confidence: 0 };
    }
  });
}

/**
 * 루트 도메인 추출
 */
function getRootDomain(domain: string): string {
  const parts = domain.split('.');
  if (parts.length <= 2) {
    return domain;
  }
  // co.kr, com.au 같은 ccTLD 처리
  const lastPart = parts[parts.length - 1];
  const secondLastPart = parts[parts.length - 2];
  if (
    lastPart !== undefined &&
    secondLastPart !== undefined &&
    lastPart.length === 2 &&
    (secondLastPart === 'co' || secondLastPart === 'com' || secondLastPart === 'ne')
  ) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/**
 * S002: 동일 도메인 전송
 * 현재 페이지와 동일 도메인으로의 전송
 */
export function createS002Rule(): DetectionRule {
  return createDetectionRule({
    id: 'S002',
    name: 'same_domain_transfer',
    description: '현재 페이지와 동일 도메인으로의 전송',
    category: RuleCategory.SAFE,
    priority: 95,
    enabled: true,
    tags: ['same-origin'],

    check: (contextUnknown) => {
      const context = contextUnknown as DetectionContext;
      const { request, currentDomain } = context;

      // 정확히 동일한 도메인
      if (request.domain === currentDomain) {
        return {
          match: true,
          confidence: 0.95,
          details: { relationship: 'exact_match' }
        };
      }

      // 서브도메인 관계
      const isSubdomain =
        request.domain.endsWith(`.${currentDomain}`) ||
        currentDomain.endsWith(`.${request.domain}`);

      if (isSubdomain) {
        return {
          match: true,
          confidence: 0.9,
          details: { relationship: 'subdomain' }
        };
      }

      // 동일 루트 도메인 (예: api.example.com → www.example.com)
      const requestRoot = getRootDomain(request.domain);
      const currentRoot = getRootDomain(currentDomain);

      if (requestRoot === currentRoot) {
        return {
          match: true,
          confidence: 0.85,
          details: {
            relationship: 'same_root',
            rootDomain: requestRoot
          }
        };
      }

      return { match: false, confidence: 0 };
    }
  });
}

/**
 * 분석 서비스 도메인 목록
 */
const ANALYTICS_PROVIDERS: readonly string[] = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'hotjar.com',
  'mixpanel.com',
  'segment.com',
  'amplitude.com',
  'heap.io'
];

/**
 * 고민감도 필드 타입 (카드, CVV, 비밀번호)
 */
const HIGH_SENSITIVITY_FIELDS: readonly SensitiveFieldType[] = [
  SensitiveFieldType.CARD_NUMBER,
  SensitiveFieldType.CVV,
  SensitiveFieldType.PASSWORD
];

/**
 * S003: 분석 서비스 (민감 정보 없음)
 * 분석 서비스로의 전송 (민감 정보 미포함)
 */
export function createS003Rule(): DetectionRule {
  return createDetectionRule({
    id: 'S003',
    name: 'analytics_no_sensitive',
    description: '분석 서비스로의 전송 (민감 정보 미포함)',
    category: RuleCategory.SAFE,
    priority: 80,
    enabled: true,
    tags: ['analytics'],

    check: (contextUnknown) => {
      const context = contextUnknown as DetectionContext;
      const { request, recentInputs } = context;

      const isAnalytics = ANALYTICS_PROVIDERS.some((provider) =>
        request.domain.includes(provider)
      );

      if (!isAnalytics) {
        return { match: false, confidence: 0 };
      }

      // 최근 1초 이내 고민감도 입력이 없으면 안전
      const hasRecentHighSensitive = recentInputs.some(
        (input) =>
          request.timestamp - input.timestamp < 1000 &&
          HIGH_SENSITIVITY_FIELDS.includes(input.fieldType)
      );

      if (!hasRecentHighSensitive) {
        return {
          match: true,
          confidence: 0.85,
          details: {
            service: request.domain,
            reason: 'no_recent_sensitive_input'
          }
        };
      }

      return { match: false, confidence: 0 };
    }
  });
}

/**
 * 모든 안전 규칙 생성
 */
export function createAllSafeRules(): DetectionRule[] {
  return [createS001Rule(), createS002Rule(), createS003Rule()];
}
