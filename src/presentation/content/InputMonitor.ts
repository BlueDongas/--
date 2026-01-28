/**
 * ============================================================================
 * 파일: InputMonitor.ts
 * ============================================================================
 *
 * [역할]
 * 웹페이지 내의 민감한 입력 필드(신용카드, 비밀번호 등)를 감지하고
 * 사용자가 입력할 때마다 이를 모니터링합니다.
 *
 * [비유]
 * "금고 감시 시스템"과 같습니다:
 * - 페이지에서 "금고"(민감 필드)가 어디 있는지 파악
 * - 누군가 금고를 열면(입력하면) 즉시 알림
 * - 새로운 금고가 추가되면 자동으로 감시 목록에 추가
 *
 * [민감 필드 감지 방법]
 * 1. autocomplete 속성 확인 (cc-number, cc-csc 등)
 * 2. type 속성 확인 (password)
 * 3. name/id 속성의 패턴 확인 (card, cvv, expiry 등)
 *
 * [MutationObserver 사용]
 * 페이지의 DOM 변화를 실시간으로 감시합니다:
 * - 새 입력 필드 추가 → 자동 등록
 * - 입력 필드 삭제 → 자동 해제
 * - 속성 변경 → 재검사
 *
 * [이벤트 모니터링]
 * - input: 키보드 입력 시
 * - change: 값 변경 완료 시
 * - blur: 포커스 이탈 시
 *
 * [주요 메서드]
 * - start(): 모니터링 시작
 * - stop(): 모니터링 중지
 * - getSensitiveFields(): 감지된 민감 필드 목록
 * - onSensitiveInput(callback): 민감 입력 시 콜백
 *
 * [다른 파일과의 관계]
 * - content/index.ts: 이 모니터 사용
 * - SensitiveFieldType.ts: 필드 타입 정의 및 패턴
 * - WarningModal.ts: 민감 입력 감지 후 경고 표시
 *
 * [흐름]
 * start() → 기존 필드 스캔 → MutationObserver 설정
 * → 이벤트 리스너 등록 → 입력 감지 시 콜백 호출
 * ============================================================================
 */

import {
  SensitiveFieldType,
  inferFieldTypeFromPattern,
  inferFieldTypeFromAutocomplete,
  SENSITIVE_FIELD_PATTERNS
} from '@domain/value-objects/SensitiveFieldType';

/**
 * 민감 필드 정보 인터페이스
 */
export interface SensitiveFieldInfo {
  element: HTMLInputElement;
  fieldId: string;
  fieldType: SensitiveFieldType;
  domPath: string;
}

/**
 * 민감 입력 콜백 타입
 */
export type SensitiveInputCallback = (info: SensitiveFieldInfo, value: string) => void;

/**
 * InputMonitor 클래스
 * 페이지 내 민감한 입력 필드를 감지하고 입력 이벤트를 모니터링합니다.
 */
export class InputMonitor {
  private sensitiveFields: Map<string, SensitiveFieldInfo> = new Map();
  private callbacks: Set<SensitiveInputCallback> = new Set();
  private mutationObserver: MutationObserver | null = null;
  private isRunning: boolean = false;
  private boundHandleInput: (event: Event) => void;
  private boundHandleChange: (event: Event) => void;
  private boundHandleBlur: (event: Event) => void;

  constructor() {
    this.boundHandleInput = this.handleInputEvent.bind(this);
    this.boundHandleChange = this.handleInputEvent.bind(this);
    this.boundHandleBlur = this.handleInputEvent.bind(this);
  }

  /**
   * 모니터링 시작
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // 기존 필드 스캔
    this.scanForSensitiveFields();

    // MutationObserver 설정
    this.setupMutationObserver();

    // 이벤트 리스너 등록
    document.addEventListener('input', this.boundHandleInput, true);
    document.addEventListener('change', this.boundHandleChange, true);
    document.addEventListener('blur', this.boundHandleBlur, true);
  }

  /**
   * 모니터링 중지
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // MutationObserver 해제
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // 이벤트 리스너 해제
    document.removeEventListener('input', this.boundHandleInput, true);
    document.removeEventListener('change', this.boundHandleChange, true);
    document.removeEventListener('blur', this.boundHandleBlur, true);

    // 필드 목록 초기화
    this.sensitiveFields.clear();
  }

  /**
   * 감지된 민감 필드 목록 반환
   */
  getSensitiveFields(): ReadonlyMap<string, SensitiveFieldInfo> {
    return this.sensitiveFields;
  }

  /**
   * 민감 입력 콜백 등록
   */
  onSensitiveInput(callback: SensitiveInputCallback): void {
    this.callbacks.add(callback);
  }

  /**
   * 민감 입력 콜백 해제
   */
  offSensitiveInput(callback: SensitiveInputCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * 페이지 내 민감 필드 스캔
   */
  private scanForSensitiveFields(): void {
    const inputs = document.querySelectorAll('input');
    console.log('[FormJacking Guard] Scanning for sensitive fields, found', inputs.length, 'inputs');
    inputs.forEach((input) => this.checkAndRegisterField(input));
    console.log('[FormJacking Guard] Registered', this.sensitiveFields.size, 'sensitive fields');
  }

  /**
   * MutationObserver 설정
   */
  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // 추가된 노드 처리
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLInputElement) {
            this.checkAndRegisterField(node);
          } else if (node instanceof HTMLElement) {
            const inputs = node.querySelectorAll('input');
            inputs.forEach((input) => this.checkAndRegisterField(input));
          }
        });

        // 제거된 노드 처리
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLInputElement) {
            this.unregisterField(node);
          } else if (node instanceof HTMLElement) {
            const inputs = node.querySelectorAll('input');
            inputs.forEach((input) => this.unregisterField(input));
          }
        });

        // 속성 변경 처리
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLInputElement) {
          const input = mutation.target;
          const existingId = this.getFieldIdFromElement(input);

          if (this.sensitiveFields.has(existingId)) {
            // 이미 등록된 필드의 속성이 변경됨
            this.unregisterField(input);
          }
          this.checkAndRegisterField(input);
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'name', 'id', 'autocomplete']
    });
  }

  /**
   * 필드 검사 및 등록
   */
  private checkAndRegisterField(input: HTMLInputElement): void {
    // hidden, disabled 필드 제외
    if (input.type === 'hidden' || input.disabled) {
      return;
    }

    const fieldType = this.detectFieldType(input);
    console.log('[FormJacking Guard] Field check:', {
      name: input.name,
      id: input.id,
      autocomplete: input.autocomplete,
      type: input.type,
      detectedType: fieldType
    });

    if (fieldType === SensitiveFieldType.UNKNOWN) {
      return;
    }

    const fieldId = this.getFieldIdFromElement(input);
    const domPath = this.getDomPath(input);

    const fieldInfo: SensitiveFieldInfo = {
      element: input,
      fieldId,
      fieldType,
      domPath
    };

    this.sensitiveFields.set(fieldId, fieldInfo);
    console.log('[FormJacking Guard] Registered sensitive field:', fieldId, fieldType);
  }

  /**
   * 필드 등록 해제
   */
  private unregisterField(input: HTMLInputElement): void {
    // DOM에서 제거된 요소는 경로가 바뀔 수 있으므로, 요소 참조로 찾아서 삭제
    for (const [fieldId, fieldInfo] of this.sensitiveFields) {
      if (fieldInfo.element === input) {
        this.sensitiveFields.delete(fieldId);
        return;
      }
    }
  }

  /**
   * 필드 타입 감지
   */
  private detectFieldType(input: HTMLInputElement): SensitiveFieldType {
    // 1. autocomplete 속성 확인
    const autocomplete = input.autocomplete;
    if (autocomplete && SENSITIVE_FIELD_PATTERNS.autocomplete.includes(autocomplete as typeof SENSITIVE_FIELD_PATTERNS.autocomplete[number])) {
      return inferFieldTypeFromAutocomplete(autocomplete);
    }

    // 2. type 속성 확인
    if (input.type === 'password') {
      return SensitiveFieldType.PASSWORD;
    }

    // 3. name/id 속성 패턴 확인
    const nameOrId = input.name || input.id;
    if (nameOrId) {
      const typeFromPattern = inferFieldTypeFromPattern(nameOrId);
      if (typeFromPattern !== SensitiveFieldType.UNKNOWN) {
        return typeFromPattern;
      }
    }

    return SensitiveFieldType.UNKNOWN;
  }

  /**
   * 요소에서 고유 필드 ID 생성
   */
  private getFieldIdFromElement(input: HTMLInputElement): string {
    // ID가 있으면 ID 사용
    if (input.id) {
      return `field-${input.id}`;
    }

    // name이 있으면 name + DOM 위치 조합
    if (input.name) {
      const index = this.getElementIndex(input);
      return `field-${input.name}-${index}`;
    }

    // DOM 경로 기반 ID
    return `field-${this.getDomPath(input)}`;
  }

  /**
   * 요소의 형제 요소 내 인덱스
   */
  private getElementIndex(element: HTMLElement): number {
    if (!element.parentElement) {
      return 0;
    }

    const siblings = Array.from(element.parentElement.children);
    return siblings.indexOf(element);
  }

  /**
   * DOM 경로 생성
   */
  private getDomPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break; // ID가 있으면 여기서 종료
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
          selector += `.${classes[0]}`;
        }
      }

      // 형제 요소 내 인덱스 추가
      const parentElement = current.parentElement;
      if (parentElement !== null) {
        const currentTagName = current.tagName;
        const siblings = Array.from(parentElement.children).filter(
          (child) => child.tagName === currentTagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * 입력 이벤트 핸들러
   */
  private handleInputEvent(event: Event): void {
    const target = event.target;
    console.log('[FormJacking Guard] Input event:', event.type, target);

    if (!(target instanceof HTMLInputElement)) {
      console.log('[FormJacking Guard] Not an input element');
      return;
    }

    const fieldId = this.getFieldIdFromElement(target);
    const fieldInfo = this.sensitiveFields.get(fieldId);
    console.log('[FormJacking Guard] Field lookup:', fieldId, fieldInfo ? 'found' : 'not found');

    if (!fieldInfo) {
      return;
    }

    const value = target.value;

    // 빈 값은 무시
    if (!value) {
      return;
    }

    console.log('[FormJacking Guard] Calling callbacks for sensitive input');
    // 콜백 호출
    this.callbacks.forEach((callback) => {
      try {
        callback(fieldInfo, value);
      } catch (error) {
        console.error('[FormJacking Guard] Callback error:', error);
      }
    });
  }
}
