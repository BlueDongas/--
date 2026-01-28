/**
 * ============================================================================
 * 파일: SensitiveFieldType.ts
 * ============================================================================
 *
 * [역할]
 * 사용자가 웹페이지에 입력하는 민감한 정보의 종류를 정의합니다.
 * 예: 카드번호, CVV, 비밀번호, 이메일 등
 *
 * [비유]
 * 은행에서 "개인정보 분류표"와 같습니다.
 * - 어떤 정보가 민감한지 분류하고
 * - 각 정보의 위험도를 판단하는 기준이 됩니다.
 *
 * [주요 기능]
 * 1. SensitiveFieldType 열거형: 민감 정보 종류 정의 (카드번호, CVV 등)
 * 2. isCardRelatedField(): 카드 관련 필드인지 확인
 * 3. isHighSensitivityField(): 즉시 경고가 필요한 고위험 필드인지 확인
 * 4. inferFieldTypeFromPattern(): 입력 필드의 name/id에서 필드 유형 추론
 * 5. inferFieldTypeFromAutocomplete(): autocomplete 속성에서 필드 유형 추론
 *
 * [다른 파일과의 관계]
 * - SensitiveInput.ts: 이 타입을 사용하여 민감 입력 정보를 생성
 * - DangerRules.ts, SafeRules.ts: 탐지 규칙에서 필드 유형별 처리
 * - InputMonitor.ts: 사용자 입력 감지 시 필드 유형 판별에 사용
 *
 * [흐름]
 * 사용자 입력 → InputMonitor가 필드 분석 → 이 파일의 함수로 유형 판별
 * → SensitiveInput 엔티티 생성 → 탐지 규칙에서 활용
 * ============================================================================
 */

/**
 * 민감 필드 유형 열거형
 */
export enum SensitiveFieldType {
  CARD_NUMBER = 'card_number',
  CVV = 'cvv',
  EXPIRY_DATE = 'expiry_date',
  PASSWORD = 'password',
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  UNKNOWN = 'unknown'
}

/**
 * 카드 관련 필드인지 확인
 */
export function isCardRelatedField(type: SensitiveFieldType): boolean {
  return [
    SensitiveFieldType.CARD_NUMBER,
    SensitiveFieldType.CVV,
    SensitiveFieldType.EXPIRY_DATE
  ].includes(type);
}

/**
 * 고민감도 필드인지 확인 (즉시 경고가 필요한 필드)
 */
export function isHighSensitivityField(type: SensitiveFieldType): boolean {
  return [
    SensitiveFieldType.CARD_NUMBER,
    SensitiveFieldType.CVV,
    SensitiveFieldType.PASSWORD,
    SensitiveFieldType.SSN
  ].includes(type);
}

/**
 * 민감 필드 감지 패턴 상수
 */
export const SENSITIVE_FIELD_PATTERNS = {
  /**
   * input type 속성 패턴
   */
  type: ['password', 'tel', 'number'] as const,

  /**
   * name/id 속성 패턴 (정규식)
   */
  name: [
    /card|credit|cc[-_]?num/i,
    /cvv|cvc|csc/i,
    /exp|valid/i,
    /password|pwd|passwd/i,
    /ssn|social/i,
    /email/i,
    /phone|tel/i
  ] as const,

  /**
   * autocomplete 속성 패턴
   */
  autocomplete: [
    'cc-number',
    'cc-csc',
    'cc-exp',
    'cc-exp-month',
    'cc-exp-year',
    'current-password',
    'new-password'
  ] as const
} as const;

/**
 * 패턴에서 필드 타입 추론
 */
export function inferFieldTypeFromPattern(
  nameOrId: string
): SensitiveFieldType {
  const lowered = nameOrId.toLowerCase();

  if (/cvv|cvc|csc/i.test(lowered)) {
    return SensitiveFieldType.CVV;
  }
  if (/card|credit|cc[-_]?num/i.test(lowered)) {
    return SensitiveFieldType.CARD_NUMBER;
  }
  if (/exp|valid/i.test(lowered)) {
    return SensitiveFieldType.EXPIRY_DATE;
  }
  if (/password|pwd|passwd/i.test(lowered)) {
    return SensitiveFieldType.PASSWORD;
  }
  if (/ssn|social/i.test(lowered)) {
    return SensitiveFieldType.SSN;
  }
  if (/email/i.test(lowered)) {
    return SensitiveFieldType.EMAIL;
  }
  if (/phone|tel/i.test(lowered)) {
    return SensitiveFieldType.PHONE;
  }

  return SensitiveFieldType.UNKNOWN;
}

/**
 * autocomplete 속성에서 필드 타입 추론
 */
export function inferFieldTypeFromAutocomplete(
  autocomplete: string
): SensitiveFieldType {
  switch (autocomplete) {
    case 'cc-number':
      return SensitiveFieldType.CARD_NUMBER;
    case 'cc-csc':
      return SensitiveFieldType.CVV;
    case 'cc-exp':
    case 'cc-exp-month':
    case 'cc-exp-year':
      return SensitiveFieldType.EXPIRY_DATE;
    case 'current-password':
    case 'new-password':
      return SensitiveFieldType.PASSWORD;
    default:
      return SensitiveFieldType.UNKNOWN;
  }
}
