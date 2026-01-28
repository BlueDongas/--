/**
 * ============================================================================
 * 파일: trustedDomains.ts
 * ============================================================================
 *
 * [역할]
 * 신뢰할 수 있는 도메인 목록을 정의합니다.
 * 이 목록에 있는 도메인으로의 데이터 전송은 안전하다고 판단합니다.
 *
 * [비유]
 * "VIP 출입 명단"과 같습니다:
 * - 이 명단에 있는 곳은 신뢰할 수 있음
 * - 검사 없이 통과 가능
 *
 * [정의된 목록들]
 *
 * TRUSTED_PAYMENT_GATEWAYS (결제 게이트웨이):
 * - 글로벌: Stripe, PayPal, Square, Braintree, Adyen, Authorize.net
 * - 국내: 이니시스, KCP, 나이스페이, 토스페이먼츠, 카카오페이, 네이버페이
 * - 이 도메인으로 카드 정보 전송 = 정상적인 결제
 *
 * KNOWN_ANALYTICS_DOMAINS (분석 서비스):
 * - Google Analytics, Hotjar, Mixpanel, Amplitude 등
 * - 주의: 카드 정보가 이곳으로 가면 위험 (D004 규칙)
 *
 * KNOWN_CDN_DOMAINS (CDN 서비스):
 * - Cloudflare, jsDelivr, unpkg, Google CDN 등
 * - 정적 파일 제공용으로 안전
 *
 * [제공하는 함수들]
 * - isTrustedPaymentGateway(): 결제 게이트웨이인지 확인
 * - isKnownAnalyticsDomain(): 분석 서비스인지 확인
 * - isKnownCDNDomain(): CDN인지 확인
 *
 * [다른 파일과의 관계]
 * - SafeRules.ts: S001 규칙에서 결제 게이트웨이 확인
 * - DangerRules.ts: D003 규칙에서 CDN 화이트리스트 확인
 *
 * [확장 방법]
 * 새로운 결제 게이트웨이 추가 시:
 * TRUSTED_PAYMENT_GATEWAYS 배열에 도메인 추가
 * ============================================================================
 */

/**
 * 알려진 결제 게이트웨이 도메인
 */
export const TRUSTED_PAYMENT_GATEWAYS: readonly string[] = Object.freeze([
  // Stripe
  'stripe.com',
  'js.stripe.com',
  'api.stripe.com',

  // PayPal
  'paypal.com',
  'www.paypal.com',
  'api.paypal.com',
  'paypalobjects.com',

  // Square
  'squareup.com',
  'square.com',
  'squareupsandbox.com',

  // Braintree
  'braintree-api.com',
  'braintreegateway.com',

  // Adyen
  'adyen.com',
  'live.adyen.com',
  'test.adyen.com',

  // Authorize.net
  'authorize.net',
  'api.authorize.net',

  // 국내 결제사
  'inicis.com',
  'stdpay.inicis.com',
  'kcp.co.kr',
  'pay.kcp.co.kr',
  'nicepay.co.kr',
  'pay.nicepay.co.kr',
  'tosspayments.com',
  'api.tosspayments.com',
  'kakaopay.com',
  'pay.kakao.com',
  'naverpay.com',
  'pay.naver.com'
]);

/**
 * 알려진 분석 서비스 도메인 (민감 정보를 수집하지 않는 서비스)
 */
export const KNOWN_ANALYTICS_DOMAINS: readonly string[] = Object.freeze([
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'hotjar.com',
  'clarity.ms',
  'mixpanel.com',
  'amplitude.com',
  'segment.io',
  'segment.com',
  'heap.io',
  'heapanalytics.com',
  'fullstory.com',
  'logrocket.com'
]);

/**
 * 알려진 CDN 도메인
 */
export const KNOWN_CDN_DOMAINS: readonly string[] = Object.freeze([
  'cloudflare.com',
  'cdn.cloudflare.com',
  'cdnjs.cloudflare.com',
  'jsdelivr.net',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'ajax.googleapis.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.aws.amazon.com',
  'cloudfront.net',
  'akamaized.net',
  'fastly.net'
]);

/**
 * 도메인이 신뢰할 수 있는 결제 게이트웨이인지 확인
 */
export function isTrustedPaymentGateway(domain: string): boolean {
  const lower = domain.toLowerCase();
  return TRUSTED_PAYMENT_GATEWAYS.some(
    (trusted) => lower === trusted || lower.endsWith(`.${trusted}`)
  );
}

/**
 * 도메인이 알려진 분석 서비스인지 확인
 */
export function isKnownAnalyticsDomain(domain: string): boolean {
  const lower = domain.toLowerCase();
  return KNOWN_ANALYTICS_DOMAINS.some(
    (known) => lower === known || lower.endsWith(`.${known}`)
  );
}

/**
 * 도메인이 알려진 CDN인지 확인
 */
export function isKnownCDNDomain(domain: string): boolean {
  const lower = domain.toLowerCase();
  return KNOWN_CDN_DOMAINS.some(
    (known) => lower === known || lower.endsWith(`.${known}`)
  );
}
