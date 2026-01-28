/**
 * ============================================================================
 * 파일: DetectSensitiveInputUseCase.ts
 * ============================================================================
 *
 * [역할]
 * 사용자 입력 필드가 "민감한 정보"인지 감지하는 유즈케이스입니다.
 * 필드의 속성(name, autocomplete, type)을 분석하여 유형을 판별합니다.
 *
 * [비유]
 * "입력 필드 분류기"와 같습니다:
 * - 이 입력창은 카드번호를 입력받는 곳인가?
 * - 이 입력창은 비밀번호를 입력받는 곳인가?
 *
 * [필드 유형 추론 우선순위]
 * 1. autocomplete 속성 (가장 정확함)
 *    - 예: autocomplete="cc-number" → 카드번호
 * 2. fieldName (name/id 속성) 패턴 매칭
 *    - 예: name="card-number" → 카드번호
 * 3. inputType (type 속성)
 *    - 예: type="password" → 비밀번호
 *
 * [제공하는 기능]
 * - execute(): 민감 입력 감지 실행
 *   - 입력: SensitiveInputRequestDTO (필드 정보)
 *   - 출력: SensitiveInputResponseDTO (감지 결과)
 *
 * [반환 정보]
 * - isSensitive: 민감 입력 여부
 * - fieldType: 필드 유형 (CARD_NUMBER, CVV, PASSWORD 등)
 * - isHighSensitivity: 고민감도 여부 (즉시 경고 필요)
 *
 * [의존성]
 * - InputStore: 감지된 민감 입력을 임시 저장 (탐지 시 참조용)
 *
 * [다른 파일과의 관계]
 * - InputMonitor.ts: 사용자 입력 감지 시 이 유즈케이스 호출
 * - SensitiveFieldType.ts: 필드 유형 추론 함수 사용
 *
 * [흐름]
 * 사용자가 입력 필드에 타이핑 → InputMonitor 감지
 * → DetectSensitiveInputUseCase.execute()
 * → 필드 유형 판별 → InputStore에 저장
 * → 이후 네트워크 요청 분석 시 참조
 * ============================================================================
 */

import {
  SensitiveInputRequestDTO,
  SensitiveInputResponseDTO
} from '@application/dto/AnalysisDTO';
import {
  inferFieldTypeFromAutocomplete,
  inferFieldTypeFromPattern,
  isHighSensitivityField,
  SensitiveFieldType
} from '@domain/value-objects/SensitiveFieldType';

/**
 * 입력 저장소 인터페이스
 */
export interface InputStore {
  add(input: SensitiveInputResponseDTO): void;
  getRecent(withinMs: number): SensitiveInputResponseDTO[];
}

/**
 * 유즈케이스 의존성
 */
export interface DetectSensitiveInputUseCaseDeps {
  inputStore: InputStore;
}

/**
 * DetectSensitiveInputUseCase 클래스
 */
export class DetectSensitiveInputUseCase {
  private readonly inputStore: InputStore;

  constructor(deps: DetectSensitiveInputUseCaseDeps) {
    this.inputStore = deps.inputStore;
  }

  /**
   * 민감 입력 감지 실행
   */
  execute(request: SensitiveInputRequestDTO): SensitiveInputResponseDTO {
    // 1. 필드 타입 추론 (우선순위: autocomplete > fieldName > inputType)
    const fieldType = this.inferFieldType(request);

    // 2. 민감 여부 및 고민감도 판단
    const isSensitive = fieldType !== SensitiveFieldType.UNKNOWN;
    const isHighSensitivity = isHighSensitivityField(fieldType);

    // 3. 응답 생성
    const response: SensitiveInputResponseDTO = {
      isSensitive,
      fieldType,
      isHighSensitivity,
      inputId: request.fieldId
    };

    // 4. 민감 입력인 경우 저장소에 추가
    if (isSensitive) {
      this.inputStore.add(response);
    }

    return response;
  }

  /**
   * 필드 타입 추론 (우선순위: autocomplete > fieldName > inputType)
   */
  private inferFieldType(request: SensitiveInputRequestDTO): SensitiveFieldType {
    // 1. autocomplete 속성 우선
    if (request.autocomplete !== undefined && request.autocomplete !== '') {
      const typeFromAutocomplete = inferFieldTypeFromAutocomplete(
        request.autocomplete
      );
      if (typeFromAutocomplete !== SensitiveFieldType.UNKNOWN) {
        return typeFromAutocomplete;
      }
    }

    // 2. fieldName 패턴 매칭
    if (request.fieldName !== undefined && request.fieldName !== '') {
      const typeFromName = inferFieldTypeFromPattern(request.fieldName);
      if (typeFromName !== SensitiveFieldType.UNKNOWN) {
        return typeFromName;
      }
    }

    // 3. inputType 매칭
    if (request.inputType !== undefined && request.inputType !== '') {
      return this.inferFromInputType(request.inputType);
    }

    return SensitiveFieldType.UNKNOWN;
  }

  /**
   * input type 속성에서 필드 타입 추론
   */
  private inferFromInputType(inputType: string): SensitiveFieldType {
    switch (inputType) {
      case 'password':
        return SensitiveFieldType.PASSWORD;
      case 'tel':
        return SensitiveFieldType.PHONE;
      case 'email':
        return SensitiveFieldType.EMAIL;
      default:
        return SensitiveFieldType.UNKNOWN;
    }
  }
}
