/**
 * DetectSensitiveInputUseCase 테스트
 */

import {
  SensitiveInputRequestDTO,
  SensitiveInputResponseDTO
} from '@application/dto/AnalysisDTO';
import {
  DetectSensitiveInputUseCase,
  DetectSensitiveInputUseCaseDeps
} from '@application/use-cases/DetectSensitiveInputUseCase';
import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';

/**
 * Mock InputStore 생성
 */
interface InputStore {
  add(input: SensitiveInputResponseDTO): void;
  getRecent(withinMs: number): SensitiveInputResponseDTO[];
}

function createMockInputStore(): InputStore {
  return {
    add: jest.fn(),
    getRecent: jest.fn().mockReturnValue([])
  };
}

/**
 * 테스트용 입력 요청 생성
 */
function createTestRequest(
  overrides?: Partial<SensitiveInputRequestDTO>
): SensitiveInputRequestDTO {
  return {
    fieldId: 'test-field-1',
    fieldName: 'credit-card',
    inputType: 'text',
    autocomplete: 'cc-number',
    inputLength: 16,
    domPath: 'html > body > form > input',
    timestamp: Date.now(),
    ...overrides
  };
}

describe('DetectSensitiveInputUseCase', () => {
  let useCase: DetectSensitiveInputUseCase;
  let mockInputStore: InputStore;

  beforeEach(() => {
    mockInputStore = createMockInputStore();

    const deps: DetectSensitiveInputUseCaseDeps = {
      inputStore: mockInputStore
    };

    useCase = new DetectSensitiveInputUseCase(deps);
  });

  describe('execute', () => {
    describe('autocomplete 속성 기반 감지', () => {
      it('cc-number autocomplete는 카드번호로 감지해야 한다', () => {
        const request = createTestRequest({
          autocomplete: 'cc-number'
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.CARD_NUMBER);
        expect(result.isHighSensitivity).toBe(true);
      });

      it('cc-csc autocomplete는 CVV로 감지해야 한다', () => {
        const request = createTestRequest({
          autocomplete: 'cc-csc'
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.CVV);
        expect(result.isHighSensitivity).toBe(true);
      });

      it('cc-exp autocomplete는 만료일로 감지해야 한다', () => {
        const request = createTestRequest({
          autocomplete: 'cc-exp'
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.EXPIRY_DATE);
        expect(result.isHighSensitivity).toBe(false);
      });

      it('current-password autocomplete는 비밀번호로 감지해야 한다', () => {
        const request = createTestRequest({
          autocomplete: 'current-password'
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.PASSWORD);
        expect(result.isHighSensitivity).toBe(true);
      });
    });

    describe('필드 이름 기반 감지', () => {
      it('card 패턴이 포함된 이름은 카드번호로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'card-number',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.CARD_NUMBER);
      });

      it('cvv 패턴이 포함된 이름은 CVV로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'cvv-input',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.CVV);
      });

      it('password 패턴이 포함된 이름은 비밀번호로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'user-password',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.PASSWORD);
      });

      it('email 패턴이 포함된 이름은 이메일로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'user-email',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.EMAIL);
        expect(result.isHighSensitivity).toBe(false);
      });

      it('phone 패턴이 포함된 이름은 전화번호로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'phone-number',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.PHONE);
      });

      it('ssn 패턴이 포함된 이름은 SSN으로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'ssn-field',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.SSN);
        expect(result.isHighSensitivity).toBe(true);
      });
    });

    describe('input type 기반 감지', () => {
      it('password type은 비밀번호로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'generic-field',
          inputType: 'password',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.PASSWORD);
      });

      it('tel type은 전화번호로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'generic-field',
          inputType: 'tel',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.PHONE);
      });

      it('email type은 이메일로 감지해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'generic-field',
          inputType: 'email',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(true);
        expect(result.fieldType).toBe(SensitiveFieldType.EMAIL);
      });
    });

    describe('우선순위 테스트', () => {
      it('autocomplete가 fieldName보다 우선해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'password-field',
          autocomplete: 'cc-number'
        });

        const result = useCase.execute(request);

        expect(result.fieldType).toBe(SensitiveFieldType.CARD_NUMBER);
      });

      it('fieldName이 inputType보다 우선해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'cvv-field',
          inputType: 'password',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.fieldType).toBe(SensitiveFieldType.CVV);
      });
    });

    describe('비민감 입력', () => {
      it('패턴이 매칭되지 않으면 UNKNOWN을 반환해야 한다', () => {
        const request = createTestRequest({
          fieldName: 'username',
          inputType: 'text',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(false);
        expect(result.fieldType).toBe(SensitiveFieldType.UNKNOWN);
        expect(result.isHighSensitivity).toBe(false);
      });

      it('빈 필드 이름도 처리해야 한다', () => {
        const request = createTestRequest({
          fieldName: '',
          inputType: 'text',
          autocomplete: undefined
        });

        const result = useCase.execute(request);

        expect(result.isSensitive).toBe(false);
        expect(result.fieldType).toBe(SensitiveFieldType.UNKNOWN);
      });
    });

    describe('InputStore 통합', () => {
      it('민감 입력이 감지되면 InputStore에 저장해야 한다', () => {
        const request = createTestRequest({
          autocomplete: 'cc-number'
        });

        useCase.execute(request);

        expect(mockInputStore.add).toHaveBeenCalledTimes(1);
        expect(mockInputStore.add).toHaveBeenCalledWith(
          expect.objectContaining({
            fieldType: SensitiveFieldType.CARD_NUMBER,
            isSensitive: true
          })
        );
      });

      it('비민감 입력은 InputStore에 저장하지 않아야 한다', () => {
        const request = createTestRequest({
          fieldName: 'username',
          inputType: 'text',
          autocomplete: undefined
        });

        useCase.execute(request);

        expect(mockInputStore.add).not.toHaveBeenCalled();
      });
    });

    describe('응답 형식', () => {
      it('inputId를 포함해야 한다', () => {
        const request = createTestRequest({
          fieldId: 'my-field-123'
        });

        const result = useCase.execute(request);

        expect(result.inputId).toBe('my-field-123');
      });
    });
  });
});
