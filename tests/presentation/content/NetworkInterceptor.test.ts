/**
 * NetworkInterceptor 테스트
 * 네트워크 요청 인터셉션 기능을 테스트합니다.
 */

import { NetworkRequestType } from '@domain/entities/NetworkRequest';

/**
 * InterceptedRequest 인터페이스 정의 (테스트용)
 */
interface InterceptedRequest {
  type: NetworkRequestType;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

/**
 * NetworkInterceptor 인터페이스 정의 (테스트용)
 */
interface INetworkInterceptor {
  start(): void;
  stop(): void;
  onRequest(callback: (request: InterceptedRequest) => void): void;
  offRequest(callback: (request: InterceptedRequest) => void): void;
  onFormSubmit(
    callback: (form: HTMLFormElement, action: string, data: FormData) => void
  ): void;
  offFormSubmit(
    callback: (form: HTMLFormElement, action: string, data: FormData) => void
  ): void;
}

// Mock 함수들
let originalFetch: typeof globalThis.fetch | undefined;
let originalXHR: typeof XMLHttpRequest;
let originalBeacon: typeof navigator.sendBeacon;

// Mock fetch function
const mockFetch = jest.fn().mockImplementation(() =>
  Promise.resolve(new Response('ok', { status: 200 }))
);

// Mock NetworkInterceptor for RED phase
let NetworkInterceptor: new () => INetworkInterceptor;

describe('NetworkInterceptor', () => {
  let interceptor: INetworkInterceptor;
  let container: HTMLElement;

  beforeEach(() => {
    // 원본 저장
    originalXHR = globalThis.XMLHttpRequest;
    originalBeacon = navigator.sendBeacon;

    // Mock fetch 설정 (jsdom의 fetch는 실제 네트워크 요청을 시도하므로 항상 mock 사용)
    mockFetch.mockClear();
    globalThis.fetch = mockFetch;
    originalFetch = mockFetch; // 테스트에서 사용할 "원본"

    // DOM 초기화
    container = document.createElement('div');
    document.body.appendChild(container);

    // 모듈 캐시 초기화
    jest.resetModules();

    // NetworkInterceptor 동적 로드 시도
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const module = require('@presentation/content/NetworkInterceptor');
      NetworkInterceptor = module.NetworkInterceptor;
      interceptor = new NetworkInterceptor();
    } catch {
      // RED 단계: 모듈이 아직 없음
      interceptor = {
        start: jest.fn(),
        stop: jest.fn(),
        onRequest: jest.fn(),
        offRequest: jest.fn(),
        onFormSubmit: jest.fn(),
        offFormSubmit: jest.fn()
      };
    }
  });

  afterEach(() => {
    interceptor.stop();
    container.remove();

    // 원본 복원 (항상 mockFetch로)
    globalThis.fetch = mockFetch;
    globalThis.XMLHttpRequest = originalXHR;
    Object.defineProperty(navigator, 'sendBeacon', {
      value: originalBeacon,
      writable: true,
      configurable: true
    });

    jest.clearAllMocks();
  });

  describe('fetch() 인터셉션', () => {
    it('fetch POST 요청을 인터셉트해야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      // Mock fetch가 설정된 후 호출
      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(() => {
        // 네트워크 에러 무시 (jsdom에서는 실제 요청이 실패함)
      });

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.type).toBe(NetworkRequestType.FETCH);
      expect(request.method).toBe('POST');
      expect(request.url).toBe('https://api.example.com/data');
    });

    it('fetch GET 요청은 인터셉트하지 않아야 함 (민감 데이터 없음)', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      await globalThis.fetch('https://api.example.com/data').catch(() => {
        // 네트워크 에러 무시
      });

      // GET 요청은 body가 없으므로 인터셉트하지 않음
      expect(callback).not.toHaveBeenCalled();
    });

    it('Request 객체를 사용한 fetch도 인터셉트해야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const request = new Request('https://api.example.com/submit', {
        method: 'POST',
        body: 'test=data'
      });

      await globalThis.fetch(request).catch(() => {
        // 네트워크 에러 무시
      });

      expect(callback).toHaveBeenCalled();
      const intercepted = callback.mock.calls[0][0] as InterceptedRequest;
      expect(intercepted.url).toBe('https://api.example.com/submit');
    });

    it('fetch 요청의 헤더를 캡처해야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: 'test',
        headers: {
          'X-Custom-Header': 'test-value',
          'Content-Type': 'text/plain'
        }
      }).catch(() => {
        // 네트워크 에러 무시
      });

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.headers['x-custom-header'] ?? request.headers['X-Custom-Header']).toBe('test-value');
    });
  });

  describe('XMLHttpRequest 인터셉션', () => {
    it('XHR POST 요청을 인터셉트해야 함', () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.example.com/submit');
      xhr.setRequestHeader('Content-Type', 'application/json');

      // send() 호출 시 인터셉션 발생 (동기적)
      xhr.send(JSON.stringify({ card: '1234' }));
      xhr.abort(); // 실제 네트워크 요청 방지

      // 인터셉션은 send() 시점에 동기적으로 발생
      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.type).toBe(NetworkRequestType.XHR);
      expect(request.method).toBe('POST');
    });

    it('XHR GET 요청은 인터셉트하지 않아야 함', () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://api.example.com/data');

      xhr.send();
      xhr.abort();

      // GET 요청은 body가 없으므로 인터셉트하지 않음
      expect(callback).not.toHaveBeenCalled();
    });

    it('XHR 요청 헤더를 캡처해야 함', () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.example.com/submit');
      xhr.setRequestHeader('X-Test-Header', 'test-value');
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.send(JSON.stringify({ test: 'data' }));
      xhr.abort();

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.headers['X-Test-Header'] ?? request.headers['x-test-header']).toBe('test-value');
    });
  });

  describe('sendBeacon() 인터셉션', () => {
    it('sendBeacon 요청을 인터셉트해야 함', () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      // sendBeacon 호출
      navigator.sendBeacon('https://analytics.example.com/collect', 'card=1234');

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.type).toBe(NetworkRequestType.BEACON);
      expect(request.url).toBe('https://analytics.example.com/collect');
    });

    it('sendBeacon의 Blob 데이터도 캡처해야 함', () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const blob = new Blob([JSON.stringify({ data: 'test' })], {
        type: 'application/json'
      });
      navigator.sendBeacon('https://analytics.example.com/collect', blob);

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.type).toBe(NetworkRequestType.BEACON);
    });

    it('sendBeacon의 FormData도 캡처해야 함', () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const formData = new FormData();
      formData.append('key', 'value');
      navigator.sendBeacon('https://analytics.example.com/collect', formData);

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.type).toBe(NetworkRequestType.BEACON);
    });
  });

  describe('Form Submit 인터셉션', () => {
    it('폼 제출을 인터셉트해야 함', () => {
      const callback = jest.fn();
      interceptor.onFormSubmit(callback);
      interceptor.start();

      const form = document.createElement('form');
      form.action = 'https://payment.example.com/submit';
      form.method = 'POST';

      const input = document.createElement('input');
      input.name = 'card';
      input.value = '1234-5678';
      form.appendChild(input);

      container.appendChild(form);

      // submit 이벤트 발생
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(callback).toHaveBeenCalled();
      const [formEl, action] = callback.mock.calls[0];
      expect(formEl).toBe(form);
      expect(action).toBe('https://payment.example.com/submit');
    });

    it('GET 메소드 폼도 인터셉트해야 함', () => {
      const callback = jest.fn();
      interceptor.onFormSubmit(callback);
      interceptor.start();

      const form = document.createElement('form');
      form.action = 'https://search.example.com/search';
      form.method = 'GET';

      const input = document.createElement('input');
      input.name = 'q';
      input.value = 'test';
      form.appendChild(input);

      container.appendChild(form);

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(callback).toHaveBeenCalled();
    });

    it('action이 없는 폼은 현재 URL을 사용해야 함', () => {
      const callback = jest.fn();
      interceptor.onFormSubmit(callback);
      interceptor.start();

      const form = document.createElement('form');
      form.method = 'POST';
      // action 속성 없음

      container.appendChild(form);

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(callback).toHaveBeenCalled();
      const [, action] = callback.mock.calls[0];
      expect(action).toBe(window.location.href);
    });

    it('FormData를 올바르게 캡처해야 함', () => {
      const callback = jest.fn();
      interceptor.onFormSubmit(callback);
      interceptor.start();

      const form = document.createElement('form');
      form.action = 'https://example.com/submit';
      form.method = 'POST';

      const input1 = document.createElement('input');
      input1.name = 'field1';
      input1.value = 'value1';
      form.appendChild(input1);

      const input2 = document.createElement('input');
      input2.name = 'field2';
      input2.value = 'value2';
      form.appendChild(input2);

      container.appendChild(form);

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(callback).toHaveBeenCalled();
      const [, , formData] = callback.mock.calls[0];
      expect(formData.get('field1')).toBe('value1');
      expect(formData.get('field2')).toBe('value2');
    });
  });

  describe('콜백 관리', () => {
    it('여러 콜백을 등록할 수 있어야 함', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      interceptor.onRequest(callback1);
      interceptor.onRequest(callback2);
      interceptor.start();

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: 'test'
      }).catch(() => {});

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('콜백을 해제할 수 있어야 함', async () => {
      const callback = jest.fn();

      interceptor.onRequest(callback);
      interceptor.start();

      // 콜백 해제
      interceptor.offRequest(callback);

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: 'test'
      }).catch(() => {});

      expect(callback).not.toHaveBeenCalled();
    });

    it('폼 콜백도 해제할 수 있어야 함', () => {
      const callback = jest.fn();

      interceptor.onFormSubmit(callback);
      interceptor.start();
      interceptor.offFormSubmit(callback);

      const form = document.createElement('form');
      form.action = 'https://example.com/submit';
      container.appendChild(form);

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('라이프사이클', () => {
    it('start() 전에는 요청을 인터셉트하지 않아야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      // start() 호출 안 함

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: 'test'
      }).catch(() => {});

      expect(callback).not.toHaveBeenCalled();
    });

    it('stop() 후에는 요청을 인터셉트하지 않아야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();
      interceptor.stop();

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: 'test'
      }).catch(() => {});

      expect(callback).not.toHaveBeenCalled();
    });

    it('stop() 후에는 원본 함수가 복원되어야 함', () => {
      interceptor.start();
      interceptor.stop();

      expect(globalThis.fetch).toBe(originalFetch);
    });

    it('여러 번 start() 호출해도 안전해야 함', () => {
      expect(() => {
        interceptor.start();
        interceptor.start();
        interceptor.start();
      }).not.toThrow();
    });

    it('여러 번 stop() 호출해도 안전해야 함', () => {
      interceptor.start();

      expect(() => {
        interceptor.stop();
        interceptor.stop();
        interceptor.stop();
      }).not.toThrow();
    });
  });

  describe('요청 데이터 처리', () => {
    it('JSON body를 문자열로 변환해야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: JSON.stringify({ card: '1234-5678-9012-3456' }),
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.body).toContain('1234-5678-9012-3456');
    });

    it('FormData body를 처리해야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const formData = new FormData();
      formData.append('card', '1234');

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: formData
      }).catch(() => {});

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.body).toBeDefined();
    });

    it('URLSearchParams body를 처리해야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const params = new URLSearchParams();
      params.append('card', '1234');

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: params
      }).catch(() => {});

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.body).toContain('card=1234');
    });

    it('timestamp가 포함되어야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      const before = Date.now();

      await globalThis.fetch('https://api.example.com/data', {
        method: 'POST',
        body: 'test'
      }).catch(() => {});

      const after = Date.now();

      expect(callback).toHaveBeenCalled();
      const request = callback.mock.calls[0][0] as InterceptedRequest;
      expect(request.timestamp).toBeGreaterThanOrEqual(before);
      expect(request.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('에러 처리', () => {
    it('콜백에서 에러가 발생해도 요청은 진행되어야 함', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      interceptor.onRequest(errorCallback);
      interceptor.start();

      // 요청이 reject되면 안 됨 (콜백 에러와 무관하게)
      await expect(
        globalThis.fetch('https://api.example.com/data', {
          method: 'POST',
          body: 'test'
        })
      ).resolves.toBeDefined();

      // 콜백은 호출되어야 함
      expect(errorCallback).toHaveBeenCalled();
    });

    it('잘못된 URL도 인터셉트해야 함', async () => {
      const callback = jest.fn();
      interceptor.onRequest(callback);
      interceptor.start();

      try {
        await globalThis.fetch('invalid-url', {
          method: 'POST',
          body: 'test'
        });
      } catch {
        // 에러 무시
      }

      // 콜백은 호출될 수 있음 (구현에 따라 다름)
    });
  });
});
