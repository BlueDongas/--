/**
 * ============================================================================
 * 파일: validationUtils.ts
 * ============================================================================
 *
 * [역할]
 * 데이터 유효성 검사를 위한 유틸리티 함수들을 제공합니다.
 * 엔티티 생성, 사용자 입력 검증 등에서 사용됩니다.
 *
 * [비유]
 * "품질 검사 도구 세트"와 같습니다:
 * - 필수값 확인, 범위 확인, 형식 확인 등
 * - 검사 결과(ValidationResult)를 반환
 *
 * [ValidationResult 구조]
 * - valid: 검사 통과 여부 (true/false)
 * - errors: 에러 메시지 배열 (실패 시)
 *
 * [제공하는 검사 함수들]
 *
 * 기본 검사:
 * - validateRequired(): 필수 값 확인 (null, undefined, 빈 문자열)
 * - validateRange(): 숫자 범위 확인 (min~max)
 * - validateMinLength(): 최소 길이 확인
 * - validateMaxLength(): 최대 길이 확인
 *
 * 형식 검사:
 * - validateURL(): URL 형식 확인
 * - validatePattern(): 정규식 패턴 확인
 * - validateEnum(): 열거형 값 확인
 *
 * 배열 검사:
 * - validateArrayMinLength(): 배열 최소 길이 확인
 *
 * 유틸리티:
 * - validResult(): 성공 결과 생성
 * - invalidResult(): 실패 결과 생성
 * - mergeValidationResults(): 여러 검사 결과 병합
 *
 * [사용 예시]
 * ```typescript
 * const results = mergeValidationResults(
 *   validateRequired(name, 'name'),
 *   validateRange(age, 0, 150, 'age'),
 *   validateURL(website, 'website')
 * );
 * if (!results.valid) {
 *   console.error(results.errors);
 * }
 * ```
 *
 * [다른 파일과의 관계]
 * - 엔티티 생성 함수에서 유효성 검사에 사용
 * - 설정 저장 시 입력값 검증에 사용
 * ============================================================================
 */

/**
 * 유효성 검사 결과
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 유효성 검사 성공 결과
 */
export function validResult(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * 유효성 검사 실패 결과
 */
export function invalidResult(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

/**
 * 여러 유효성 검사 결과 병합
 */
export function mergeValidationResults(
  ...results: ValidationResult[]
): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 필수 값 검사
 */
export function validateRequired(
  value: unknown,
  fieldName: string
): ValidationResult {
  if (value === null || value === undefined) {
    return invalidResult(`${fieldName}은(는) 필수입니다`);
  }

  if (typeof value === 'string' && value.trim() === '') {
    return invalidResult(`${fieldName}은(는) 비어있을 수 없습니다`);
  }

  return validResult();
}

/**
 * 범위 검사
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (value < min || value > max) {
    return invalidResult(`${fieldName}은(는) ${min}과 ${max} 사이여야 합니다`);
  }
  return validResult();
}

/**
 * 최소 길이 검사
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string
): ValidationResult {
  if (value.length < minLength) {
    return invalidResult(`${fieldName}은(는) 최소 ${minLength}자 이상이어야 합니다`);
  }
  return validResult();
}

/**
 * 최대 길이 검사
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string
): ValidationResult {
  if (value.length > maxLength) {
    return invalidResult(`${fieldName}은(는) ${maxLength}자를 초과할 수 없습니다`);
  }
  return validResult();
}

/**
 * URL 유효성 검사
 */
export function validateURL(value: string, fieldName: string): ValidationResult {
  try {
    new URL(value);
    return validResult();
  } catch {
    return invalidResult(`${fieldName}은(는) 유효한 URL이어야 합니다`);
  }
}

/**
 * 정규식 패턴 검사
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  fieldName: string,
  message?: string
): ValidationResult {
  if (!pattern.test(value)) {
    return invalidResult(message ?? `${fieldName}의 형식이 올바르지 않습니다`);
  }
  return validResult();
}

/**
 * 배열 최소 길이 검사
 */
export function validateArrayMinLength(
  value: unknown[],
  minLength: number,
  fieldName: string
): ValidationResult {
  if (value.length < minLength) {
    return invalidResult(`${fieldName}은(는) 최소 ${minLength}개 이상이어야 합니다`);
  }
  return validResult();
}

/**
 * 열거형 값 검사
 */
export function validateEnum<T extends string | number>(
  value: unknown,
  enumObject: Record<string, T>,
  fieldName: string
): ValidationResult {
  const validValues = Object.values(enumObject);
  if (!validValues.includes(value as T)) {
    return invalidResult(
      `${fieldName}은(는) 다음 값 중 하나여야 합니다: ${validValues.join(', ')}`
    );
  }
  return validResult();
}
