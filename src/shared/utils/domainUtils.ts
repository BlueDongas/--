/**
 * ============================================================================
 * 파일: domainUtils.ts
 * ============================================================================
 *
 * [역할]
 * 도메인(웹사이트 주소) 처리를 위한 유틸리티 함수들을 제공합니다.
 * 폼재킹 탐지에서 "어디로 데이터가 전송되는가"가 중요하므로 자주 사용됩니다.
 *
 * [비유]
 * "주소 분석 도구"와 같습니다:
 * - URL에서 도메인만 추출
 * - 두 도메인이 같은 사이트인지 비교
 * - IP 주소인지, 로컬호스트인지 확인
 *
 * [제공하는 함수들]
 *
 * extractDomain(url):
 * - URL에서 도메인(hostname) 추출
 * - 예: "https://api.example.com/path" → "api.example.com"
 *
 * isSameSite(domain1, domain2):
 * - 두 도메인이 같은 사이트인지 확인 (서브도메인 포함)
 * - 예: "api.example.com"과 "example.com" → true
 * - 예: "example.com"과 "other.com" → false
 *
 * getTopLevelDomain(domain):
 * - 최상위 도메인 추출
 * - 예: "api.shop.example.com" → "example.com"
 * - .co.kr, .com.au 같은 특수 TLD도 처리
 *
 * isIPAddress(domain):
 * - IP 주소 형식인지 확인 (IPv4, IPv6)
 * - 예: "192.168.1.1" → true
 *
 * isLocalhost(domain):
 * - 로컬호스트인지 확인
 * - 예: "localhost", "127.0.0.1" → true
 *
 * isValidDomain(domain):
 * - 유효한 도메인 형식인지 검사
 *
 * [다른 파일과의 관계]
 * - NetworkRequest.ts: URL에서 도메인 추출
 * - DangerRules.ts, SafeRules.ts: 도메인 비교에 사용
 * - DetectionOrchestrator.ts: 현재 도메인과 요청 도메인 비교
 * ============================================================================
 */

/**
 * URL에서 도메인 추출
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * 두 도메인이 같은 사이트인지 확인 (서브도메인 포함)
 */
export function isSameSite(domain1: string, domain2: string): boolean {
  const d1 = domain1.toLowerCase();
  const d2 = domain2.toLowerCase();

  if (d1 === d2) return true;
  if (d1.endsWith(`.${d2}`)) return true;
  if (d2.endsWith(`.${d1}`)) return true;

  return false;
}

/**
 * 최상위 도메인 추출 (예: api.shop.example.com → example.com)
 */
export function getTopLevelDomain(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  if (parts.length <= 2) return domain;

  // 알려진 2단계 TLD 처리 (예: .co.kr, .com.au)
  const knownSecondLevelTLDs = ['co', 'com', 'net', 'org', 'edu', 'gov'];
  const secondLevelPart = parts[parts.length - 2];
  if (parts.length >= 3 && secondLevelPart !== undefined && knownSecondLevelTLDs.includes(secondLevelPart)) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * 도메인이 IP 주소인지 확인
 */
export function isIPAddress(domain: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(domain)) {
    const parts = domain.split('.').map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  // IPv6 (간단한 체크)
  if (domain.includes(':')) {
    return /^[0-9a-fA-F:]+$/.test(domain);
  }

  return false;
}

/**
 * 로컬호스트 도메인인지 확인
 */
export function isLocalhost(domain: string): boolean {
  const lower = domain.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower.endsWith('.localhost')
  );
}

/**
 * 도메인 유효성 검사
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length === 0 || domain.length > 253) {
    return false;
  }

  // IP 주소는 유효한 도메인
  if (isIPAddress(domain)) {
    return true;
  }

  // 도메인 형식 검사
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain);
}
