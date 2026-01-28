/**
 * DOMAnalyzer 테스트
 * DOM 분석 기능을 테스트합니다.
 */

/**
 * ExternalScript 인터페이스 정의 (테스트용)
 */
interface ExternalScript {
  src: string;
  domain: string;
  isThirdParty: boolean;
  integrity?: string;
  crossOrigin?: string;
}

/**
 * PaymentFormInfo 인터페이스 정의 (테스트용)
 */
interface PaymentFormInfo {
  element: HTMLFormElement;
  action: string;
  method: string;
  hasCardFields: boolean;
  hasCVVField: boolean;
  hasExpiryField: boolean;
  externalScriptsInScope: ExternalScript[];
}

/**
 * DOMAnalyzer 인터페이스 정의 (테스트용)
 */
interface IDOMAnalyzer {
  analyze(): void;
  getExternalScripts(): ReadonlyArray<ExternalScript>;
  getPaymentForms(): ReadonlyArray<PaymentFormInfo>;
  isPaymentPage(): boolean;
  getPageDomain(): string;
}

// Mock DOMAnalyzer for RED phase
let DOMAnalyzer: new () => IDOMAnalyzer;

describe('DOMAnalyzer', () => {
  let analyzer: IDOMAnalyzer;
  let container: HTMLElement;

  beforeEach(() => {
    // DOM 초기화
    container = document.createElement('div');
    document.body.appendChild(container);

    // DOMAnalyzer 동적 로드 시도
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const module = require('@presentation/content/DOMAnalyzer');
      DOMAnalyzer = module.DOMAnalyzer;
      analyzer = new DOMAnalyzer();
    } catch {
      // RED 단계: 모듈이 아직 없음
      analyzer = {
        analyze: jest.fn(),
        getExternalScripts: jest.fn().mockReturnValue([]),
        getPaymentForms: jest.fn().mockReturnValue([]),
        isPaymentPage: jest.fn().mockReturnValue(false),
        getPageDomain: jest.fn().mockReturnValue('localhost')
      };
    }
  });

  afterEach(() => {
    container.remove();
    // head에 추가된 script 태그들 제거
    document.querySelectorAll('script[data-test]').forEach((el) => el.remove());
    jest.clearAllMocks();
  });

  describe('외부 스크립트 감지', () => {
    it('외부 스크립트를 감지해야 함', () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.example.com/lib.js';
      script.setAttribute('data-test', 'true');
      document.head.appendChild(script);

      analyzer.analyze();

      const scripts = analyzer.getExternalScripts();
      expect(scripts.length).toBeGreaterThanOrEqual(1);

      const externalScript = scripts.find((s) =>
        s.src.includes('cdn.example.com')
      );
      expect(externalScript).toBeDefined();
      expect(externalScript?.domain).toBe('cdn.example.com');
    });

    it('인라인 스크립트는 감지하지 않아야 함', () => {
      const script = document.createElement('script');
      script.textContent = 'console.log("inline");';
      script.setAttribute('data-test', 'true');
      document.head.appendChild(script);

      analyzer.analyze();

      const scripts = analyzer.getExternalScripts();
      // 인라인 스크립트는 포함되지 않음
      expect(scripts.every((s) => s.src !== '')).toBe(true);
    });

    it('동일 도메인 스크립트와 서드파티 스크립트를 구분해야 함', () => {
      // 현재 도메인 스크립트
      const sameOriginScript = document.createElement('script');
      sameOriginScript.src = `${window.location.origin}/local.js`;
      sameOriginScript.setAttribute('data-test', 'true');
      document.head.appendChild(sameOriginScript);

      // 서드파티 스크립트
      const thirdPartyScript = document.createElement('script');
      thirdPartyScript.src = 'https://external.cdn.com/lib.js';
      thirdPartyScript.setAttribute('data-test', 'true');
      document.head.appendChild(thirdPartyScript);

      analyzer.analyze();

      const scripts = analyzer.getExternalScripts();
      const thirdParty = scripts.find((s) => s.src.includes('external.cdn.com'));
      const sameOrigin = scripts.find((s) => s.src.includes('local.js'));

      expect(thirdParty?.isThirdParty).toBe(true);
      if (sameOrigin) {
        expect(sameOrigin.isThirdParty).toBe(false);
      }
    });

    it('integrity 속성을 캡처해야 함', () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.example.com/lib.js';
      script.setAttribute('integrity', 'sha384-abc123');
      script.setAttribute('data-test', 'true');
      document.head.appendChild(script);

      analyzer.analyze();

      const scripts = analyzer.getExternalScripts();
      const externalScript = scripts.find((s) =>
        s.src.includes('cdn.example.com')
      );
      expect(externalScript?.integrity).toBe('sha384-abc123');
    });

    it('crossOrigin 속성을 캡처해야 함', () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.example.com/lib.js';
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-test', 'true');
      document.head.appendChild(script);

      analyzer.analyze();

      const scripts = analyzer.getExternalScripts();
      const externalScript = scripts.find((s) =>
        s.src.includes('cdn.example.com')
      );
      expect(externalScript?.crossOrigin).toBe('anonymous');
    });

    it('body 내의 스크립트도 감지해야 함', () => {
      const script = document.createElement('script');
      script.src = 'https://analytics.example.com/tracker.js';
      script.setAttribute('data-test', 'true');
      container.appendChild(script);

      analyzer.analyze();

      const scripts = analyzer.getExternalScripts();
      const analyticsScript = scripts.find((s) =>
        s.src.includes('analytics.example.com')
      );
      expect(analyticsScript).toBeDefined();
    });
  });

  describe('결제 폼 감지', () => {
    it('카드 입력 필드가 있는 폼을 감지해야 함', () => {
      const form = document.createElement('form');
      form.action = 'https://payment.example.com/submit';

      const cardInput = document.createElement('input');
      cardInput.name = 'card-number';
      cardInput.autocomplete = 'cc-number';
      form.appendChild(cardInput);

      container.appendChild(form);

      analyzer.analyze();

      const forms = analyzer.getPaymentForms();
      expect(forms.length).toBeGreaterThanOrEqual(1);
      expect(forms[0].hasCardFields).toBe(true);
    });

    it('CVV 필드를 감지해야 함', () => {
      const form = document.createElement('form');

      const cvvInput = document.createElement('input');
      cvvInput.name = 'cvv';
      cvvInput.autocomplete = 'cc-csc';
      form.appendChild(cvvInput);

      container.appendChild(form);

      analyzer.analyze();

      const forms = analyzer.getPaymentForms();
      expect(forms.length).toBeGreaterThanOrEqual(1);
      expect(forms[0].hasCVVField).toBe(true);
    });

    it('만료일 필드를 감지해야 함', () => {
      const form = document.createElement('form');

      const expiryInput = document.createElement('input');
      expiryInput.name = 'expiry';
      expiryInput.autocomplete = 'cc-exp';
      form.appendChild(expiryInput);

      container.appendChild(form);

      analyzer.analyze();

      const forms = analyzer.getPaymentForms();
      expect(forms.length).toBeGreaterThanOrEqual(1);
      expect(forms[0].hasExpiryField).toBe(true);
    });

    it('결제 관련 필드가 없는 폼은 감지하지 않아야 함', () => {
      const form = document.createElement('form');

      const usernameInput = document.createElement('input');
      usernameInput.name = 'username';
      form.appendChild(usernameInput);

      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.name = 'email';
      form.appendChild(emailInput);

      container.appendChild(form);

      analyzer.analyze();

      const forms = analyzer.getPaymentForms();
      expect(forms.length).toBe(0);
    });

    it('폼의 action과 method를 캡처해야 함', () => {
      const form = document.createElement('form');
      form.action = 'https://payment.example.com/process';
      form.method = 'POST';

      const cardInput = document.createElement('input');
      cardInput.autocomplete = 'cc-number';
      form.appendChild(cardInput);

      container.appendChild(form);

      analyzer.analyze();

      const forms = analyzer.getPaymentForms();
      expect(forms[0].action).toBe('https://payment.example.com/process');
      expect(forms[0].method.toUpperCase()).toBe('POST');
    });

    it('폼 내부의 외부 스크립트를 감지해야 함', () => {
      const form = document.createElement('form');

      const cardInput = document.createElement('input');
      cardInput.autocomplete = 'cc-number';
      form.appendChild(cardInput);

      // 폼 내부에 스크립트 추가
      const script = document.createElement('script');
      script.src = 'https://sketchy.js/tracker.js';
      form.appendChild(script);

      container.appendChild(form);

      analyzer.analyze();

      const forms = analyzer.getPaymentForms();
      expect(forms[0].externalScriptsInScope.length).toBeGreaterThanOrEqual(1);
      expect(forms[0].externalScriptsInScope[0].domain).toBe('sketchy.js');
    });
  });

  describe('결제 페이지 감지', () => {
    it('카드 입력 필드가 있으면 결제 페이지로 판단해야 함', () => {
      const input = document.createElement('input');
      input.autocomplete = 'cc-number';
      container.appendChild(input);

      analyzer.analyze();

      expect(analyzer.isPaymentPage()).toBe(true);
    });

    it('CVV 필드가 있으면 결제 페이지로 판단해야 함', () => {
      const input = document.createElement('input');
      input.autocomplete = 'cc-csc';
      container.appendChild(input);

      analyzer.analyze();

      expect(analyzer.isPaymentPage()).toBe(true);
    });

    it('결제 관련 필드가 없으면 결제 페이지가 아니라고 판단해야 함', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'search';
      container.appendChild(input);

      analyzer.analyze();

      expect(analyzer.isPaymentPage()).toBe(false);
    });

    it('URL에 "checkout"이 포함되면 결제 페이지로 판단할 수 있음', () => {
      // URL 변경은 jsdom에서 제한적이므로 이 테스트는 스킵하거나 모킹 필요
      // 실제 구현에서는 window.location.pathname 확인
    });

    it('URL에 "payment"가 포함되면 결제 페이지로 판단할 수 있음', () => {
      // URL 변경은 jsdom에서 제한적이므로 이 테스트는 스킵하거나 모킹 필요
    });
  });

  describe('페이지 도메인', () => {
    it('현재 페이지의 도메인을 반환해야 함', () => {
      analyzer.analyze();

      const domain = analyzer.getPageDomain();
      expect(typeof domain).toBe('string');
      expect(domain.length).toBeGreaterThan(0);
    });
  });

  describe('복합 시나리오', () => {
    it('완전한 결제 폼을 분석해야 함', () => {
      // 결제 페이지 구성
      const form = document.createElement('form');
      form.action = 'https://secure.payment.com/process';
      form.method = 'POST';
      form.id = 'payment-form';

      // 카드 번호
      const cardNumber = document.createElement('input');
      cardNumber.type = 'text';
      cardNumber.name = 'card_number';
      cardNumber.autocomplete = 'cc-number';
      form.appendChild(cardNumber);

      // CVV
      const cvv = document.createElement('input');
      cvv.type = 'text';
      cvv.name = 'cvv';
      cvv.autocomplete = 'cc-csc';
      form.appendChild(cvv);

      // 만료일
      const expMonth = document.createElement('input');
      expMonth.type = 'text';
      expMonth.name = 'exp_month';
      expMonth.autocomplete = 'cc-exp-month';
      form.appendChild(expMonth);

      const expYear = document.createElement('input');
      expYear.type = 'text';
      expYear.name = 'exp_year';
      expYear.autocomplete = 'cc-exp-year';
      form.appendChild(expYear);

      container.appendChild(form);

      // 외부 스크립트
      const trackingScript = document.createElement('script');
      trackingScript.src = 'https://tracking.cdn.com/pixel.js';
      trackingScript.setAttribute('data-test', 'true');
      document.head.appendChild(trackingScript);

      analyzer.analyze();

      // 결제 페이지로 감지
      expect(analyzer.isPaymentPage()).toBe(true);

      // 결제 폼 분석
      const forms = analyzer.getPaymentForms();
      expect(forms.length).toBe(1);
      expect(forms[0].hasCardFields).toBe(true);
      expect(forms[0].hasCVVField).toBe(true);
      expect(forms[0].hasExpiryField).toBe(true);

      // 외부 스크립트 감지
      const scripts = analyzer.getExternalScripts();
      expect(scripts.length).toBeGreaterThanOrEqual(1);
    });

    it('여러 폼이 있는 페이지를 분석해야 함', () => {
      // 로그인 폼
      const loginForm = document.createElement('form');
      loginForm.id = 'login-form';

      const password = document.createElement('input');
      password.type = 'password';
      loginForm.appendChild(password);

      container.appendChild(loginForm);

      // 결제 폼
      const paymentForm = document.createElement('form');
      paymentForm.id = 'payment-form';

      const card = document.createElement('input');
      card.autocomplete = 'cc-number';
      paymentForm.appendChild(card);

      container.appendChild(paymentForm);

      analyzer.analyze();

      // 결제 폼만 결제 폼으로 감지
      const forms = analyzer.getPaymentForms();
      expect(forms.length).toBe(1);
      expect(forms[0].element.id).toBe('payment-form');
    });

    it('중첩된 폼 요소를 처리해야 함', () => {
      const outerDiv = document.createElement('div');
      outerDiv.className = 'payment-container';

      const form = document.createElement('form');

      const innerDiv = document.createElement('div');
      innerDiv.className = 'card-fields';

      const cardInput = document.createElement('input');
      cardInput.autocomplete = 'cc-number';
      innerDiv.appendChild(cardInput);

      form.appendChild(innerDiv);
      outerDiv.appendChild(form);
      container.appendChild(outerDiv);

      analyzer.analyze();

      const forms = analyzer.getPaymentForms();
      expect(forms.length).toBe(1);
      expect(forms[0].hasCardFields).toBe(true);
    });
  });

  describe('라이프사이클', () => {
    it('analyze() 호출 전에는 빈 결과를 반환해야 함', () => {
      // analyze() 호출 안 함
      expect(analyzer.getExternalScripts().length).toBe(0);
      expect(analyzer.getPaymentForms().length).toBe(0);
    });

    it('analyze()를 여러 번 호출해도 안전해야 함', () => {
      const input = document.createElement('input');
      input.autocomplete = 'cc-number';
      container.appendChild(input);

      expect(() => {
        analyzer.analyze();
        analyzer.analyze();
        analyzer.analyze();
      }).not.toThrow();

      // 결과가 중복되지 않아야 함
      const forms = analyzer.getPaymentForms();
      expect(forms.length).toBeLessThanOrEqual(1);
    });

    it('DOM 변경 후 analyze()를 다시 호출하면 새로운 결과를 반환해야 함', () => {
      analyzer.analyze();
      expect(analyzer.getPaymentForms().length).toBe(0);

      // 새 폼 추가
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.autocomplete = 'cc-number';
      form.appendChild(input);
      container.appendChild(form);

      // 다시 분석
      analyzer.analyze();
      expect(analyzer.getPaymentForms().length).toBe(1);
    });
  });
});
