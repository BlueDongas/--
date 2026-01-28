/**
 * Jest 테스트 설정 파일
 * Chrome API 모킹 및 전역 설정
 */

// structuredClone 폴리필 (Node.js 17 미만 버전용)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj)) as T;
  };
}

// Request 폴리필 (jsdom에서 누락됨)
if (typeof globalThis.Request === 'undefined') {
  class RequestPolyfill {
    url: string;
    method: string;
    body: BodyInit | null;
    headers: Headers;

    constructor(input: RequestInfo | URL, init?: RequestInit) {
      this.url = typeof input === 'string' ? input : String(input);
      this.method = init?.method?.toUpperCase() ?? 'GET';
      this.body = init?.body ?? null;
      this.headers = new Headers(init?.headers);
    }

    clone(): RequestPolyfill {
      return new RequestPolyfill(this.url, {
        method: this.method,
        body: this.body,
        headers: this.headers
      });
    }
  }
  globalThis.Request = RequestPolyfill as unknown as typeof Request;
}

// Response 폴리필 (jsdom에서 누락됨)
if (typeof globalThis.Response === 'undefined') {
  class ResponsePolyfill {
    ok = true;
    status: number;
    statusText: string;
    headers: Headers;
    body: BodyInit | null;

    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.status = init?.status ?? 200;
      this.statusText = init?.statusText ?? 'OK';
      this.headers = new Headers(init?.headers);
      this.body = body ?? null;
      this.ok = this.status >= 200 && this.status < 300;
    }

    text(): Promise<string> {
      return Promise.resolve(typeof this.body === 'string' ? this.body : '');
    }

    json(): Promise<unknown> {
      return Promise.resolve(
        typeof this.body === 'string' ? JSON.parse(this.body) : {}
      );
    }

    clone(): ResponsePolyfill {
      return new ResponsePolyfill(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers
      });
    }
  }
  globalThis.Response = ResponsePolyfill as unknown as typeof Response;
}

// Chrome API Mock
const chromeMock = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    lastError: null,
    id: 'test-extension-id'
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    get: jest.fn(),
    update: jest.fn()
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    get: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  action: {
    setIcon: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  }
};

// Global chrome object
Object.defineProperty(global, 'chrome', {
  value: chromeMock,
  writable: true
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Console error suppression for expected errors in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]): void => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Expected error in test')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Navigator sendBeacon mock
Object.defineProperty(navigator, 'sendBeacon', {
  value: jest.fn().mockReturnValue(true),
  writable: true,
  configurable: true
});

export { chromeMock };
