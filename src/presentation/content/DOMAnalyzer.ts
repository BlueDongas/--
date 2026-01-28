/**
 * ============================================================================
 * 파일: DOMAnalyzer.ts
 * ============================================================================
 *
 * [역할]
 * 웹페이지의 DOM(Document Object Model) 구조를 분석합니다.
 * 결제 페이지 여부 판단, 외부 스크립트 감지, 민감한 입력 필드 탐지를 담당합니다.
 *
 * [비유]
 * "웹페이지 탐정"과 같습니다:
 * - 페이지에 어떤 폼(양식)이 있는지 조사
 * - 신용카드 번호, CVV 같은 민감 필드가 있는지 확인
 * - 외부에서 불러오는 스크립트가 있는지 파악
 * - 이 페이지가 결제 페이지인지 판단
 *
 * [결제 페이지 판단 기준]
 * 1. 카드 번호 입력 필드가 있는가?
 * 2. CVV 입력 필드가 있는가?
 * 3. URL에 checkout, payment, pay, cart 등의 단어가 포함되어 있는가?
 *
 * [외부 스크립트 분석]
 * 페이지에 포함된 <script src="..."> 태그들을 분석합니다:
 * - 스크립트의 출처(도메인) 확인
 * - 현재 페이지와 다른 도메인인지(서드파티) 판별
 * - integrity 속성(무결성 검증) 유무 확인
 *
 * [주요 메서드]
 * - analyze(): DOM 전체 분석 실행
 * - isPaymentPage(): 결제 페이지 여부 반환
 * - getExternalScripts(): 감지된 외부 스크립트 목록
 * - getPaymentForms(): 결제 폼 정보 목록
 *
 * [다른 파일과의 관계]
 * - content/index.ts: 이 분석기 사용
 * - InputMonitor.ts: 필드 타입 패턴 공유
 * - SensitiveFieldType.ts: 민감 필드 패턴 사용
 *
 * [흐름]
 * 페이지 로드 → analyze() 호출
 * → 외부 스크립트 분석 (analyzeExternalScripts)
 * → 결제 폼 분석 (analyzePaymentForms)
 * → 결과 저장 (this.externalScripts, this.paymentForms)
 * ============================================================================
 */

import { SENSITIVE_FIELD_PATTERNS } from '@domain/value-objects/SensitiveFieldType';

/**
 * 외부 스크립트 정보 인터페이스
 */
export interface ExternalScript {
  src: string;
  domain: string;
  isThirdParty: boolean;
  integrity?: string;
  crossOrigin?: string;
}

/**
 * 결제 폼 정보 인터페이스
 */
export interface PaymentFormInfo {
  element: HTMLFormElement;
  action: string;
  method: string;
  hasCardFields: boolean;
  hasCVVField: boolean;
  hasExpiryField: boolean;
  externalScriptsInScope: ExternalScript[];
}

/**
 * 카드 번호 관련 패턴
 */
const CARD_NUMBER_PATTERNS = [
  /card[-_]?num/i,
  /cc[-_]?num/i,
  /credit[-_]?card/i,
  /pan[-_]?num/i
];

/**
 * CVV 관련 패턴
 */
const CVV_PATTERNS = [/cvv/i, /cvc/i, /csc/i, /security[-_]?code/i];

/**
 * 만료일 관련 패턴
 */
const EXPIRY_PATTERNS = [/exp/i, /valid/i, /expir/i];

/**
 * DOMAnalyzer 클래스
 * 페이지의 DOM 구조를 분석합니다.
 */
export class DOMAnalyzer {
  private externalScripts: ExternalScript[] = [];
  private paymentForms: PaymentFormInfo[] = [];
  private pageDomain: string;

  constructor() {
    this.pageDomain = this.extractDomain(window.location.href);
  }

  /**
   * DOM 분석 수행
   */
  analyze(): void {
    // 이전 결과 초기화
    this.externalScripts = [];
    this.paymentForms = [];

    // 외부 스크립트 분석
    this.analyzeExternalScripts();

    // 결제 폼 분석
    this.analyzePaymentForms();
  }

  /**
   * 감지된 외부 스크립트 목록 반환
   */
  getExternalScripts(): ReadonlyArray<ExternalScript> {
    return this.externalScripts;
  }

  /**
   * 감지된 결제 폼 목록 반환
   */
  getPaymentForms(): ReadonlyArray<PaymentFormInfo> {
    return this.paymentForms;
  }

  /**
   * 결제 페이지 여부 확인
   */
  isPaymentPage(): boolean {
    // 결제 폼이 있으면 결제 페이지
    if (this.paymentForms.length > 0) {
      return true;
    }

    // 페이지 내 결제 관련 입력 필드 확인
    const allInputs = document.querySelectorAll('input');
    for (const input of allInputs) {
      if (this.isCardField(input) || this.isCVVField(input)) {
        return true;
      }
    }

    // URL 패턴 확인
    const urlPatterns = [
      /checkout/i,
      /payment/i,
      /pay/i,
      /cart/i,
      /order/i,
      /billing/i
    ];

    const currentPath = window.location.pathname + window.location.search;
    for (const pattern of urlPatterns) {
      if (pattern.test(currentPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 현재 페이지 도메인 반환
   */
  getPageDomain(): string {
    return this.pageDomain;
  }

  /**
   * 외부 스크립트 분석
   */
  private analyzeExternalScripts(): void {
    const scripts = document.querySelectorAll('script[src]');

    scripts.forEach((script) => {
      const src = script.getAttribute('src');
      if (src === null || src === '') {
        return;
      }

      // 상대 경로를 절대 경로로 변환
      let absoluteSrc: string;
      try {
        absoluteSrc = new URL(src, window.location.href).href;
      } catch {
        absoluteSrc = src;
      }

      const domain = this.extractDomain(absoluteSrc);
      const isThirdParty = this.isThirdPartyDomain(domain);

      const integrity = script.getAttribute('integrity');
      const crossOrigin = script.getAttribute('crossorigin');

      const externalScript: ExternalScript = {
        src: absoluteSrc,
        domain,
        isThirdParty,
        ...(integrity !== null && integrity !== '' ? { integrity } : {}),
        ...(crossOrigin !== null && crossOrigin !== '' ? { crossOrigin } : {})
      };

      this.externalScripts.push(externalScript);
    });
  }

  /**
   * 결제 폼 분석
   */
  private analyzePaymentForms(): void {
    const forms = document.querySelectorAll('form');

    forms.forEach((form) => {
      const formInfo = this.analyzeForm(form);

      // 결제 관련 필드가 있는 폼만 추가
      if (formInfo.hasCardFields || formInfo.hasCVVField || formInfo.hasExpiryField) {
        this.paymentForms.push(formInfo);
      }
    });
  }

  /**
   * 개별 폼 분석
   */
  private analyzeForm(form: HTMLFormElement): PaymentFormInfo {
    const inputs = form.querySelectorAll('input');

    let hasCardFields = false;
    let hasCVVField = false;
    let hasExpiryField = false;

    inputs.forEach((input) => {
      if (this.isCardField(input)) {
        hasCardFields = true;
      }
      if (this.isCVVField(input)) {
        hasCVVField = true;
      }
      if (this.isExpiryField(input)) {
        hasExpiryField = true;
      }
    });

    // 폼 내부의 외부 스크립트 감지
    const scriptsInForm = form.querySelectorAll('script[src]');
    const externalScriptsInScope: ExternalScript[] = [];

    scriptsInForm.forEach((script) => {
      const src = script.getAttribute('src');
      if (src === null || src === '') {
        return;
      }

      let absoluteSrc: string;
      try {
        absoluteSrc = new URL(src, window.location.href).href;
      } catch {
        absoluteSrc = src;
      }

      const domain = this.extractDomain(absoluteSrc);
      const integrity = script.getAttribute('integrity');
      const crossOrigin = script.getAttribute('crossorigin');

      externalScriptsInScope.push({
        src: absoluteSrc,
        domain,
        isThirdParty: this.isThirdPartyDomain(domain),
        ...(integrity !== null && integrity !== '' ? { integrity } : {}),
        ...(crossOrigin !== null && crossOrigin !== '' ? { crossOrigin } : {})
      });
    });

    return {
      element: form,
      action: form.action !== '' ? form.action : window.location.href,
      method: form.method !== '' ? form.method : 'GET',
      hasCardFields,
      hasCVVField,
      hasExpiryField,
      externalScriptsInScope
    };
  }

  /**
   * 카드 번호 필드인지 확인
   */
  private isCardField(input: HTMLInputElement): boolean {
    // autocomplete 확인
    const autocomplete = input.autocomplete;
    if (autocomplete === 'cc-number') {
      return true;
    }

    // name/id 패턴 확인
    const nameOrId = (input.name !== '' ? input.name : input.id).toLowerCase();
    for (const pattern of CARD_NUMBER_PATTERNS) {
      if (pattern.test(nameOrId)) {
        return true;
      }
    }

    // 일반 name 패턴 확인
    for (const pattern of SENSITIVE_FIELD_PATTERNS.name) {
      if (
        pattern.source.includes('card') ||
        pattern.source.includes('cc[-_]?num')
      ) {
        if (pattern.test(nameOrId)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * CVV 필드인지 확인
   */
  private isCVVField(input: HTMLInputElement): boolean {
    // autocomplete 확인
    const autocomplete = input.autocomplete;
    if (autocomplete === 'cc-csc') {
      return true;
    }

    // name/id 패턴 확인
    const nameOrId = (input.name !== '' ? input.name : input.id).toLowerCase();
    for (const pattern of CVV_PATTERNS) {
      if (pattern.test(nameOrId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 만료일 필드인지 확인
   */
  private isExpiryField(input: HTMLInputElement): boolean {
    // autocomplete 확인
    const autocomplete = input.autocomplete;
    if (
      autocomplete === 'cc-exp' ||
      autocomplete === 'cc-exp-month' ||
      autocomplete === 'cc-exp-year'
    ) {
      return true;
    }

    // name/id 패턴 확인
    const nameOrId = (input.name !== '' ? input.name : input.id).toLowerCase();
    for (const pattern of EXPIRY_PATTERNS) {
      if (pattern.test(nameOrId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * URL에서 도메인 추출
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      // 상대 URL이거나 잘못된 URL인 경우
      return '';
    }
  }

  /**
   * 서드파티 도메인인지 확인
   */
  private isThirdPartyDomain(domain: string): boolean {
    if (domain === '') {
      return false;
    }

    const pageDomain = this.pageDomain.toLowerCase();
    const checkDomain = domain.toLowerCase();

    // 정확히 같은 도메인
    if (checkDomain === pageDomain) {
      return false;
    }

    // 서브도메인 확인
    if (checkDomain.endsWith(`.${pageDomain}`)) {
      return false;
    }

    // 부모 도메인 확인
    if (pageDomain.endsWith(`.${checkDomain}`)) {
      return false;
    }

    return true;
  }
}
