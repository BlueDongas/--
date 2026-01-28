/**
 * InputMonitor 테스트
 * 민감한 입력 필드 감시 기능을 테스트합니다.
 */

import { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';

// InputMonitor는 아직 구현되지 않음 - TDD RED 단계
// import { InputMonitor, SensitiveFieldInfo } from '@presentation/content/InputMonitor';

/**
 * SensitiveFieldInfo 인터페이스 정의 (테스트용)
 */
interface SensitiveFieldInfo {
  element: HTMLInputElement;
  fieldId: string;
  fieldType: SensitiveFieldType;
  domPath: string;
}

/**
 * InputMonitor 인터페이스 정의 (테스트용)
 */
interface IInputMonitor {
  start(): void;
  stop(): void;
  getSensitiveFields(): ReadonlyMap<string, SensitiveFieldInfo>;
  onSensitiveInput(
    callback: (info: SensitiveFieldInfo, value: string) => void
  ): void;
  offSensitiveInput(
    callback: (info: SensitiveFieldInfo, value: string) => void
  ): void;
}

// Mock InputMonitor for RED phase
let InputMonitor: new () => IInputMonitor;

describe('InputMonitor', () => {
  let monitor: IInputMonitor;
  let container: HTMLElement;

  beforeEach(() => {
    // DOM 초기화
    container = document.createElement('div');
    document.body.appendChild(container);

    // InputMonitor 동적 로드 시도
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const module = require('@presentation/content/InputMonitor');
      InputMonitor = module.InputMonitor;
      monitor = new InputMonitor();
    } catch {
      // RED 단계: 모듈이 아직 없음
      monitor = {
        start: jest.fn(),
        stop: jest.fn(),
        getSensitiveFields: jest.fn().mockReturnValue(new Map()),
        onSensitiveInput: jest.fn(),
        offSensitiveInput: jest.fn()
      };
    }
  });

  afterEach(() => {
    monitor.stop();
    container.remove();
    jest.clearAllMocks();
  });

  describe('민감 필드 감지', () => {
    it('type="password" 입력 필드를 감지해야 함', () => {
      const input = document.createElement('input');
      input.type = 'password';
      input.id = 'user-password';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      expect(fields.size).toBeGreaterThanOrEqual(1);

      const field = Array.from(fields.values()).find(
        (f) => f.fieldType === SensitiveFieldType.PASSWORD
      );
      expect(field).toBeDefined();
      expect(field?.element).toBe(input);
    });

    it('name 속성에 "card" 포함된 필드를 감지해야 함', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'card-number';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const field = Array.from(fields.values()).find(
        (f) => f.fieldType === SensitiveFieldType.CARD_NUMBER
      );
      expect(field).toBeDefined();
    });

    it('name 속성에 "cvv" 포함된 필드를 감지해야 함', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'cvv';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const field = Array.from(fields.values()).find(
        (f) => f.fieldType === SensitiveFieldType.CVV
      );
      expect(field).toBeDefined();
    });

    it('autocomplete="cc-number" 필드를 감지해야 함', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'cc-number';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const field = Array.from(fields.values()).find(
        (f) => f.fieldType === SensitiveFieldType.CARD_NUMBER
      );
      expect(field).toBeDefined();
    });

    it('autocomplete="cc-csc" 필드를 감지해야 함', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'cc-csc';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const field = Array.from(fields.values()).find(
        (f) => f.fieldType === SensitiveFieldType.CVV
      );
      expect(field).toBeDefined();
    });

    it('autocomplete="cc-exp" 필드를 감지해야 함', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'cc-exp';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const field = Array.from(fields.values()).find(
        (f) => f.fieldType === SensitiveFieldType.EXPIRY_DATE
      );
      expect(field).toBeDefined();
    });

    it('id 속성에 "ssn" 포함된 필드를 감지해야 함', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.id = 'ssn-input';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const field = Array.from(fields.values()).find(
        (f) => f.fieldType === SensitiveFieldType.SSN
      );
      expect(field).toBeDefined();
    });

    it('일반 텍스트 입력 필드는 감지하지 않아야 함', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'username';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      expect(fields.size).toBe(0);
    });

    it('hidden 필드는 감지하지 않아야 함', () => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'card-number';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      expect(fields.size).toBe(0);
    });

    it('disabled 필드는 감지하지 않아야 함', () => {
      const input = document.createElement('input');
      input.type = 'password';
      input.disabled = true;
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      expect(fields.size).toBe(0);
    });
  });

  describe('동적 필드 감지 (MutationObserver)', () => {
    it('동적으로 추가된 민감 필드를 감지해야 함', async () => {
      monitor.start();

      // 초기에는 필드 없음
      expect(monitor.getSensitiveFields().size).toBe(0);

      // 동적으로 필드 추가
      const input = document.createElement('input');
      input.type = 'password';
      input.id = 'dynamic-password';
      container.appendChild(input);

      // MutationObserver가 동작할 시간을 줌
      await new Promise((resolve) => setTimeout(resolve, 50));

      const fields = monitor.getSensitiveFields();
      expect(fields.size).toBeGreaterThanOrEqual(1);
    });

    it('제거된 필드는 목록에서 삭제되어야 함', async () => {
      const input = document.createElement('input');
      input.type = 'password';
      container.appendChild(input);

      monitor.start();

      // 필드가 감지됨
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(monitor.getSensitiveFields().size).toBeGreaterThanOrEqual(1);

      // 필드 제거
      input.remove();

      // MutationObserver가 동작할 시간을 줌
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(monitor.getSensitiveFields().size).toBe(0);
    });

    it('속성 변경으로 민감 필드가 된 경우 감지해야 함', async () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'generic-field';
      container.appendChild(input);

      monitor.start();

      // 초기에는 민감 필드로 인식되지 않음
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(monitor.getSensitiveFields().size).toBe(0);

      // 속성 변경
      input.name = 'card-number';

      // MutationObserver가 동작할 시간을 줌
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(monitor.getSensitiveFields().size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('입력 이벤트 감지', () => {
    it('민감 필드에 입력 시 콜백이 호출되어야 함', async () => {
      const callback = jest.fn();

      const input = document.createElement('input');
      input.type = 'password';
      container.appendChild(input);

      monitor.onSensitiveInput(callback);
      monitor.start();

      // 입력 이벤트 시뮬레이션
      input.value = 'secret123';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
      const [fieldInfo, value] = callback.mock.calls[0];
      expect(fieldInfo.fieldType).toBe(SensitiveFieldType.PASSWORD);
      expect(value.length).toBe(9);
    });

    it('change 이벤트에도 콜백이 호출되어야 함', async () => {
      const callback = jest.fn();

      const input = document.createElement('input');
      input.type = 'password';
      container.appendChild(input);

      monitor.onSensitiveInput(callback);
      monitor.start();

      // change 이벤트 시뮬레이션
      input.value = 'password123';
      input.dispatchEvent(new Event('change', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
    });

    it('blur 이벤트에도 콜백이 호출되어야 함', async () => {
      const callback = jest.fn();

      const input = document.createElement('input');
      input.type = 'password';
      container.appendChild(input);

      monitor.onSensitiveInput(callback);
      monitor.start();

      // blur 이벤트 시뮬레이션
      input.value = 'test';
      input.dispatchEvent(new Event('blur', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
    });

    it('빈 값 입력 시에는 콜백이 호출되지 않아야 함', async () => {
      const callback = jest.fn();

      const input = document.createElement('input');
      input.type = 'password';
      container.appendChild(input);

      monitor.onSensitiveInput(callback);
      monitor.start();

      // 빈 값 입력
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).not.toHaveBeenCalled();
    });

    it('콜백 해제 후에는 호출되지 않아야 함', async () => {
      const callback = jest.fn();

      const input = document.createElement('input');
      input.type = 'password';
      container.appendChild(input);

      monitor.onSensitiveInput(callback);
      monitor.start();

      // 콜백 해제
      monitor.offSensitiveInput(callback);

      // 입력 이벤트 시뮬레이션
      input.value = 'test';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('DOM 경로 생성', () => {
    it('고유한 DOM 경로를 생성해야 함', () => {
      const form = document.createElement('form');
      form.id = 'payment-form';

      const fieldset = document.createElement('fieldset');

      const input = document.createElement('input');
      input.type = 'password';
      input.name = 'card-pin';

      fieldset.appendChild(input);
      form.appendChild(fieldset);
      container.appendChild(form);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const field = Array.from(fields.values())[0];

      // DOM 경로가 포함되어야 함
      expect(field?.domPath).toContain('form');
      expect(field?.domPath).toContain('fieldset');
      expect(field?.domPath).toContain('input');
    });

    it('ID가 있는 요소는 ID를 포함해야 함', () => {
      const input = document.createElement('input');
      input.type = 'password';
      input.id = 'my-password-field';
      container.appendChild(input);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const field = Array.from(fields.values())[0];

      expect(field?.domPath).toContain('#my-password-field');
    });
  });

  describe('필드 ID 생성', () => {
    it('동일한 필드는 동일한 ID를 가져야 함', () => {
      const input = document.createElement('input');
      input.type = 'password';
      input.id = 'test-password';
      container.appendChild(input);

      monitor.start();

      const fields1 = monitor.getSensitiveFields();
      const field1 = Array.from(fields1.values())[0];

      // 다시 시작해도 동일한 ID
      monitor.stop();
      monitor.start();

      const fields2 = monitor.getSensitiveFields();
      const field2 = Array.from(fields2.values())[0];

      expect(field1?.fieldId).toBe(field2?.fieldId);
    });

    it('서로 다른 필드는 다른 ID를 가져야 함', () => {
      const input1 = document.createElement('input');
      input1.type = 'password';
      input1.id = 'password1';
      container.appendChild(input1);

      const input2 = document.createElement('input');
      input2.type = 'password';
      input2.id = 'password2';
      container.appendChild(input2);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const fieldIds = Array.from(fields.values()).map((f) => f.fieldId);

      expect(new Set(fieldIds).size).toBe(fieldIds.length);
    });
  });

  describe('라이프사이클', () => {
    it('start() 호출 전에는 필드를 감지하지 않아야 함', () => {
      const input = document.createElement('input');
      input.type = 'password';
      container.appendChild(input);

      // start() 호출 안 함
      expect(monitor.getSensitiveFields().size).toBe(0);
    });

    it('stop() 호출 후에는 새 필드를 감지하지 않아야 함', async () => {
      monitor.start();
      monitor.stop();

      // 새 필드 추가
      const input = document.createElement('input');
      input.type = 'password';
      container.appendChild(input);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(monitor.getSensitiveFields().size).toBe(0);
    });

    it('여러 번 start() 호출해도 안전해야 함', () => {
      expect(() => {
        monitor.start();
        monitor.start();
        monitor.start();
      }).not.toThrow();
    });

    it('여러 번 stop() 호출해도 안전해야 함', () => {
      monitor.start();

      expect(() => {
        monitor.stop();
        monitor.stop();
        monitor.stop();
      }).not.toThrow();
    });
  });

  describe('복합 시나리오', () => {
    it('결제 폼의 여러 민감 필드를 모두 감지해야 함', () => {
      // 결제 폼 구성
      const form = document.createElement('form');
      form.id = 'payment-form';

      const cardNumber = document.createElement('input');
      cardNumber.type = 'text';
      cardNumber.name = 'card-number';
      cardNumber.autocomplete = 'cc-number';

      const cvv = document.createElement('input');
      cvv.type = 'text';
      cvv.name = 'cvv';
      cvv.autocomplete = 'cc-csc';

      const expiry = document.createElement('input');
      expiry.type = 'text';
      expiry.name = 'expiry';
      expiry.autocomplete = 'cc-exp';

      form.appendChild(cardNumber);
      form.appendChild(cvv);
      form.appendChild(expiry);
      container.appendChild(form);

      monitor.start();

      const fields = monitor.getSensitiveFields();
      const fieldTypes = Array.from(fields.values()).map((f) => f.fieldType);

      expect(fieldTypes).toContain(SensitiveFieldType.CARD_NUMBER);
      expect(fieldTypes).toContain(SensitiveFieldType.CVV);
      expect(fieldTypes).toContain(SensitiveFieldType.EXPIRY_DATE);
    });

    it('iframe 내부 필드는 감지하지 않아야 함 (cross-origin 제한)', () => {
      const iframe = document.createElement('iframe');
      container.appendChild(iframe);

      // iframe 내부에 직접 접근할 수 없으므로 이 테스트는 제한적
      monitor.start();

      // iframe 외부의 필드만 감지됨
      expect(monitor.getSensitiveFields().size).toBe(0);
    });
  });
});
