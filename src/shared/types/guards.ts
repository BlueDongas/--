/**
 * ============================================================================
 * 파일: guards.ts
 * ============================================================================
 *
 * [역할]
 * TypeScript의 "타입 가드(Type Guard)" 함수들을 모아둔 파일입니다.
 * 런타임에 값의 타입을 확인하고, TypeScript 컴파일러에게 타입을 알려줍니다.
 *
 * [비유]
 * "신분증 확인 검사관"과 같습니다:
 * - 이 값이 정말 Verdict 타입인가?
 * - 이 값이 정말 배열인가?
 * - 확인 후 보장해줍니다
 *
 * [타입 가드란?]
 * TypeScript에서 unknown이나 any 타입의 값을 안전하게 사용하기 위한 함수
 *
 * 예시:
 * ```typescript
 * function process(value: unknown) {
 *   if (isVerdict(value)) {
 *     // 여기서 value는 Verdict 타입으로 확정됨
 *     console.log(value.toUpperCase()); // OK
 *   }
 * }
 * ```
 *
 * [제공하는 타입 가드]
 *
 * 열거형 타입 가드:
 * - isVerdict(): Verdict 타입인지 확인
 * - isRecommendation(): Recommendation 타입인지 확인
 * - isSensitiveFieldType(): SensitiveFieldType인지 확인
 * - isNetworkRequestType(): NetworkRequestType인지 확인
 * - isRuleCategory(): RuleCategory인지 확인
 * - isMessageType(): MessageType인지 확인
 *
 * 일반 타입 가드:
 * - isNotNull(): null이 아닌지 확인
 * - isDefined(): undefined가 아닌지 확인
 * - isPresent(): null과 undefined 둘 다 아닌지 확인
 * - isNonEmptyString(): 비어있지 않은 문자열인지 확인
 * - isValidNumber(): NaN, Infinity가 아닌 유효한 숫자인지 확인
 * - isNonEmptyArray(): 비어있지 않은 배열인지 확인
 * - isObject(): 객체인지 확인 (null, 배열 제외)
 *
 * [다른 파일과의 관계]
 * - 메시지 처리 시 payload 타입 확인에 사용
 * - 외부 데이터(Storage, API 응답) 파싱 시 사용
 * ============================================================================
 */

import { RuleCategory } from '@domain/entities/DetectionRule';
import { NetworkRequestType } from '@domain/entities/NetworkRequest';
import { MessageType } from '@domain/ports/IMessenger';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';
import { Verdict, Recommendation } from '@domain/value-objects/Verdict';

/**
 * Verdict 타입 가드
 */
export function isVerdict(value: unknown): value is Verdict {
  return Object.values(Verdict).includes(value as Verdict);
}

/**
 * Recommendation 타입 가드
 */
export function isRecommendation(value: unknown): value is Recommendation {
  return Object.values(Recommendation).includes(value as Recommendation);
}

/**
 * SensitiveFieldType 타입 가드
 */
export function isSensitiveFieldType(value: unknown): value is SensitiveFieldType {
  return Object.values(SensitiveFieldType).includes(value as SensitiveFieldType);
}

/**
 * NetworkRequestType 타입 가드
 */
export function isNetworkRequestType(value: unknown): value is NetworkRequestType {
  return Object.values(NetworkRequestType).includes(value as NetworkRequestType);
}

/**
 * RuleCategory 타입 가드
 */
export function isRuleCategory(value: unknown): value is RuleCategory {
  return Object.values(RuleCategory).includes(value as RuleCategory);
}

/**
 * MessageType 타입 가드
 */
export function isMessageType(value: unknown): value is MessageType {
  return Object.values(MessageType).includes(value as MessageType);
}

/**
 * 객체가 null이 아닌지 확인
 */
export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

/**
 * 객체가 undefined가 아닌지 확인
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * 객체가 null 또는 undefined가 아닌지 확인
 */
export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 문자열이 비어있지 않은지 확인
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 숫자가 유효한지 확인 (NaN, Infinity 제외)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value);
}

/**
 * 배열이 비어있지 않은지 확인
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * 객체인지 확인 (null 제외)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
