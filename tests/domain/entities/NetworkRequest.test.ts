/**
 * NetworkRequest 엔티티 테스트
 */

import {
  NetworkRequestType,
  createNetworkRequest,
  isExternalRequest,
  isPostRequest,
  isBeaconRequest,
  NetworkRequestProps
} from '@domain/entities/NetworkRequest';

describe('NetworkRequestType', () => {
  it('모든 네트워크 요청 타입이 정의되어 있어야 한다', () => {
    expect(NetworkRequestType.FETCH).toBe('fetch');
    expect(NetworkRequestType.XHR).toBe('xhr');
    expect(NetworkRequestType.BEACON).toBe('beacon');
    expect(NetworkRequestType.FORM).toBe('form');
    expect(NetworkRequestType.WEBSOCKET).toBe('websocket');
  });
});

describe('NetworkRequest', () => {
  const validProps: NetworkRequestProps = {
    type: NetworkRequestType.FETCH,
    url: 'https://api.example.com/checkout',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payloadSize: 256,
    timestamp: Date.now()
  };

  describe('createNetworkRequest', () => {
    it('유효한 props로 NetworkRequest를 생성해야 한다', () => {
      const request = createNetworkRequest(validProps);

      expect(request.type).toBe(validProps.type);
      expect(request.url).toBe(validProps.url);
      expect(request.method).toBe(validProps.method);
      expect(request.payloadSize).toBe(validProps.payloadSize);
    });

    it('id가 자동 생성되어야 한다', () => {
      const request = createNetworkRequest(validProps);
      expect(request.id).toBeDefined();
      expect(typeof request.id).toBe('string');
    });

    it('domain이 URL에서 자동 추출되어야 한다', () => {
      const request = createNetworkRequest(validProps);
      expect(request.domain).toBe('api.example.com');
    });

    it('잘못된 URL로 생성 시 에러가 발생해야 한다', () => {
      expect(() =>
        createNetworkRequest({ ...validProps, url: 'invalid-url' })
      ).toThrow('유효하지 않은 URL입니다');
    });

    it('음수 payloadSize로 생성 시 에러가 발생해야 한다', () => {
      expect(() =>
        createNetworkRequest({ ...validProps, payloadSize: -1 })
      ).toThrow('payloadSize는 0 이상이어야 합니다');
    });

    it('빈 method로 생성 시 에러가 발생해야 한다', () => {
      expect(() =>
        createNetworkRequest({ ...validProps, method: '' })
      ).toThrow('method는 비어있을 수 없습니다');
    });

    it('headers가 없으면 빈 객체로 초기화되어야 한다', () => {
      const propsWithoutHeaders: NetworkRequestProps = {
        type: validProps.type,
        url: validProps.url,
        method: validProps.method,
        payloadSize: validProps.payloadSize,
        timestamp: validProps.timestamp
      };
      const request = createNetworkRequest(propsWithoutHeaders);
      expect(request.headers).toEqual({});
    });
  });

  describe('isExternalRequest', () => {
    it('다른 도메인으로의 요청은 외부 요청이다', () => {
      const request = createNetworkRequest({
        ...validProps,
        url: 'https://external.com/api'
      });

      expect(isExternalRequest(request, 'mysite.com')).toBe(true);
    });

    it('같은 도메인으로의 요청은 외부 요청이 아니다', () => {
      const request = createNetworkRequest({
        ...validProps,
        url: 'https://mysite.com/api'
      });

      expect(isExternalRequest(request, 'mysite.com')).toBe(false);
    });

    it('서브도메인으로의 요청은 외부 요청이 아니다', () => {
      const request = createNetworkRequest({
        ...validProps,
        url: 'https://api.mysite.com/checkout'
      });

      expect(isExternalRequest(request, 'mysite.com')).toBe(false);
    });

    it('부모 도메인으로의 요청은 외부 요청이 아니다', () => {
      const request = createNetworkRequest({
        ...validProps,
        url: 'https://mysite.com/api'
      });

      expect(isExternalRequest(request, 'api.mysite.com')).toBe(false);
    });
  });

  describe('불변성', () => {
    it('NetworkRequest는 불변이어야 한다', () => {
      const request = createNetworkRequest(validProps);

      expect(() => {
        (request as { url: string }).url = 'https://hacked.com';
      }).toThrow();
    });

    it('headers는 불변이어야 한다', () => {
      const request = createNetworkRequest(validProps);

      expect(() => {
        (request.headers as Record<string, string>)['X-Hacked'] = 'true';
      }).toThrow();
    });
  });

  describe('isPostRequest', () => {
    it('POST 메서드는 true를 반환해야 한다', () => {
      const request = createNetworkRequest({ ...validProps, method: 'POST' });
      expect(isPostRequest(request)).toBe(true);
    });

    it('post 소문자도 true를 반환해야 한다', () => {
      const request = createNetworkRequest({ ...validProps, method: 'post' });
      expect(isPostRequest(request)).toBe(true);
    });

    it('GET 메서드는 false를 반환해야 한다', () => {
      const request = createNetworkRequest({ ...validProps, method: 'GET' });
      expect(isPostRequest(request)).toBe(false);
    });
  });

  describe('isBeaconRequest', () => {
    it('BEACON 타입은 true를 반환해야 한다', () => {
      const request = createNetworkRequest({
        ...validProps,
        type: NetworkRequestType.BEACON
      });
      expect(isBeaconRequest(request)).toBe(true);
    });

    it('FETCH 타입은 false를 반환해야 한다', () => {
      const request = createNetworkRequest({
        ...validProps,
        type: NetworkRequestType.FETCH
      });
      expect(isBeaconRequest(request)).toBe(false);
    });
  });
});
