/**
 * ============================================================================
 * 파일: SensitiveInput.ts
 * ============================================================================
 *
 * [역할]
 * 사용자가 웹페이지에 입력한 민감 정보를 나타내는 "엔티티"입니다.
 * 입력된 데이터 자체는 저장하지 않고, 메타데이터만 저장합니다.
 * (보안상 실제 카드번호나 비밀번호는 저장하지 않음)
 *
 * [비유]
 * 택배 송장과 같습니다:
 * - 내용물(민감 데이터) 자체는 기록하지 않지만
 * - "언제", "어디서", "어떤 종류의" 정보가 입력됐는지 기록합니다.
 *
 * [저장하는 정보]
 * - fieldId: 입력 필드의 고유 ID (예: "card-number-input")
 * - fieldType: 필드 유형 (카드번호, CVV, 비밀번호 등)
 * - inputLength: 입력된 값의 길이 (실제 값은 저장 안 함)
 * - timestamp: 입력 시간
 * - domPath: DOM 트리에서의 위치
 *
 * [주요 함수]
 * - createSensitiveInput(): 새 SensitiveInput 생성 (유효성 검사 포함)
 * - isRecentInput(): 최근 입력인지 확인 (기본 500ms 이내)
 * - findMostRecentInput(): 배열에서 가장 최근 입력 찾기
 * - filterRecentInputs(): 특정 시간 이내의 입력만 필터링
 *
 * [다른 파일과의 관계]
 * - InputMonitor.ts: 사용자 입력 감지 시 SensitiveInput 생성
 * - DangerRules.ts: 탐지 규칙에서 recentInputs로 사용
 * - DetectionOrchestrator.ts: 분석 시 최근 입력 정보 전달
 *
 * [흐름]
 * 사용자 입력 → InputMonitor → createSensitiveInput()
 * → 메모리에 저장 → 네트워크 요청 발생 시 탐지 규칙에 전달
 * ============================================================================
 */

import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';

/**
 * SensitiveInput 생성 Props
 */
export interface SensitiveInputProps {
  fieldId: string;
  fieldType: SensitiveFieldType;
  inputLength: number;
  timestamp: number;
  domPath: string;
}

/**
 * SensitiveInput 엔티티 인터페이스
 */
export interface SensitiveInput extends Readonly<SensitiveInputProps> {
  readonly id: string;
}

/**
 * 고유 ID 생성
 */
function generateId(): string {
  return `input-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * SensitiveInput 생성 함수
 */
export function createSensitiveInput(props: SensitiveInputProps): SensitiveInput {
  // 유효성 검사
  if (props.fieldId.trim() === '') {
    throw new Error('fieldId는 비어있을 수 없습니다');
  }

  if (props.inputLength < 0) {
    throw new Error('inputLength는 0 이상이어야 합니다');
  }

  if (props.timestamp > Date.now()) {
    throw new Error('timestamp는 미래 시간일 수 없습니다');
  }

  // 불변 객체 생성
  const sensitiveInput: SensitiveInput = Object.freeze({
    id: generateId(),
    fieldId: props.fieldId,
    fieldType: props.fieldType,
    inputLength: props.inputLength,
    timestamp: props.timestamp,
    domPath: props.domPath
  });

  return sensitiveInput;
}

/**
 * 최근 입력인지 확인
 * @param input 입력 정보
 * @param thresholdMs 임계값 (밀리초, 기본값 500ms)
 */
export function isRecentInput(
  input: SensitiveInput,
  thresholdMs: number = 500
): boolean {
  const elapsed = Date.now() - input.timestamp;
  return elapsed > 0 && elapsed < thresholdMs;
}

/**
 * 입력 정보 배열에서 가장 최근 입력 찾기
 */
export function findMostRecentInput(
  inputs: readonly SensitiveInput[]
): SensitiveInput | undefined {
  if (inputs.length === 0) {
    return undefined;
  }

  return inputs.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );
}

/**
 * 특정 시간 이내의 입력만 필터링
 */
export function filterRecentInputs(
  inputs: readonly SensitiveInput[],
  withinMs: number
): SensitiveInput[] {
  const threshold = Date.now() - withinMs;
  return inputs.filter((input) => input.timestamp > threshold);
}
