/**
 * ChromeMessenger 테스트
 */

import {
  Message,
  MessageHandler,
  MessageType
} from '@domain/ports/IMessenger';
import { ChromeMessenger } from '@infrastructure/messaging/ChromeMessenger';

describe('ChromeMessenger', () => {
  let messenger: ChromeMessenger;
  let mockSendMessage: jest.Mock;
  let mockTabsSendMessage: jest.Mock;
  let mockTabsQuery: jest.Mock;
  let addListenerCallbacks: Array<
    (
      message: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void
    ) => boolean | undefined
  >;

  beforeEach(() => {
    addListenerCallbacks = [];

    // Chrome runtime mock
    mockSendMessage = jest.fn();
    (chrome.runtime.sendMessage as jest.Mock) = mockSendMessage;
    (chrome.runtime.onMessage.addListener as jest.Mock) = jest.fn(
      (
        callback: (
          message: Message,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response: unknown) => void
        ) => boolean | undefined
      ) => {
        addListenerCallbacks.push(callback);
      }
    );
    (chrome.runtime.onMessage.removeListener as jest.Mock) = jest.fn(
      (
        callback: (
          message: Message,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response: unknown) => void
        ) => boolean | undefined
      ) => {
        const index = addListenerCallbacks.indexOf(callback);
        if (index > -1) {
          addListenerCallbacks.splice(index, 1);
        }
      }
    );

    // Chrome tabs mock
    mockTabsSendMessage = jest.fn();
    mockTabsQuery = jest.fn();
    (chrome.tabs.sendMessage as jest.Mock) = mockTabsSendMessage;
    (chrome.tabs.query as jest.Mock) = mockTabsQuery;

    messenger = new ChromeMessenger();
  });

  describe('sendToTab', () => {
    it('특정 탭에 메시지를 전송해야 함', async () => {
      const tabId = 123;
      const message: Message<{ test: string }> = {
        type: MessageType.SHOW_WARNING,
        payload: { test: 'data' },
        timestamp: Date.now()
      };

      mockTabsSendMessage.mockImplementation(
        (
          _tabId: number,
          _msg: Message,
          callback: (response: unknown) => void
        ) => {
          callback({ success: true, data: 'ok' });
        }
      );

      const response = await messenger.sendToTab<{ test: string }, string>(
        tabId,
        message
      );

      expect(mockTabsSendMessage).toHaveBeenCalledWith(
        tabId,
        message,
        expect.any(Function)
      );
      expect(response.success).toBe(true);
      expect(response.data).toBe('ok');
    });

    it('탭이 응답하지 않으면 에러 응답을 반환해야 함', async () => {
      const tabId = 123;
      const message: Message = {
        type: MessageType.SHOW_WARNING,
        payload: {},
        timestamp: Date.now()
      };

      // chrome.runtime.lastError 설정
      Object.defineProperty(chrome.runtime, 'lastError', {
        value: { message: 'Could not establish connection' },
        configurable: true
      });

      mockTabsSendMessage.mockImplementation(
        (
          _tabId: number,
          _msg: Message,
          callback: (response: unknown) => void
        ) => {
          callback(undefined);
        }
      );

      const response = await messenger.sendToTab(tabId, message);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Could not establish connection');

      Object.defineProperty(chrome.runtime, 'lastError', {
        value: null,
        configurable: true
      });
    });
  });

  describe('sendToBackground', () => {
    it('백그라운드에 메시지를 전송해야 함', async () => {
      const message: Message<{ action: string }> = {
        type: MessageType.ANALYZE_REQUEST,
        payload: { action: 'analyze' },
        timestamp: Date.now()
      };

      mockSendMessage.mockImplementation(
        (_msg: Message, callback: (response: unknown) => void) => {
          callback({ success: true, data: { result: 'analyzed' } });
        }
      );

      const response = await messenger.sendToBackground<
        { action: string },
        { result: string }
      >(message);

      expect(mockSendMessage).toHaveBeenCalledWith(
        message,
        expect.any(Function)
      );
      expect(response.success).toBe(true);
      expect(response.data?.result).toBe('analyzed');
    });

    it('백그라운드 응답이 없으면 에러 응답을 반환해야 함', async () => {
      const message: Message = {
        type: MessageType.GET_STATUS,
        payload: {},
        timestamp: Date.now()
      };

      Object.defineProperty(chrome.runtime, 'lastError', {
        value: { message: 'Extension not available' },
        configurable: true
      });

      mockSendMessage.mockImplementation(
        (_msg: Message, callback: (response: unknown) => void) => {
          callback(undefined);
        }
      );

      const response = await messenger.sendToBackground(message);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Extension not available');

      Object.defineProperty(chrome.runtime, 'lastError', {
        value: null,
        configurable: true
      });
    });
  });

  describe('broadcast', () => {
    it('모든 탭에 메시지를 브로드캐스트해야 함', async () => {
      const message: Message = {
        type: MessageType.STATE_UPDATE,
        payload: { status: 'updated' },
        timestamp: Date.now()
      };

      const tabs = [{ id: 1 }, { id: 2 }, { id: 3 }] as chrome.tabs.Tab[];

      mockTabsQuery.mockImplementation(
        (
          _query: chrome.tabs.QueryInfo,
          callback: (tabs: chrome.tabs.Tab[]) => void
        ) => {
          callback(tabs);
        }
      );

      mockTabsSendMessage.mockImplementation(
        (
          _tabId: number,
          _msg: Message,
          callback: (response: unknown) => void
        ) => {
          callback({ success: true });
        }
      );

      await messenger.broadcast(message);

      expect(mockTabsQuery).toHaveBeenCalled();
      expect(mockTabsSendMessage).toHaveBeenCalledTimes(3);
    });

    it('id가 없는 탭은 건너뛰어야 함', async () => {
      const message: Message = {
        type: MessageType.STATE_UPDATE,
        payload: {},
        timestamp: Date.now()
      };

      const tabs = [
        { id: 1 },
        { id: undefined },
        { id: 2 }
      ] as chrome.tabs.Tab[];

      mockTabsQuery.mockImplementation(
        (
          _query: chrome.tabs.QueryInfo,
          callback: (tabs: chrome.tabs.Tab[]) => void
        ) => {
          callback(tabs);
        }
      );

      mockTabsSendMessage.mockImplementation(
        (
          _tabId: number,
          _msg: Message,
          callback: (response: unknown) => void
        ) => {
          callback({ success: true });
        }
      );

      await messenger.broadcast(message);

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(2);
    });

    it('개별 탭 전송 실패해도 계속 진행해야 함', async () => {
      const message: Message = {
        type: MessageType.STATE_UPDATE,
        payload: {},
        timestamp: Date.now()
      };

      const tabs = [{ id: 1 }, { id: 2 }] as chrome.tabs.Tab[];

      mockTabsQuery.mockImplementation(
        (
          _query: chrome.tabs.QueryInfo,
          callback: (tabs: chrome.tabs.Tab[]) => void
        ) => {
          callback(tabs);
        }
      );

      let callCount = 0;
      mockTabsSendMessage.mockImplementation(
        (
          _tabId: number,
          _msg: Message,
          callback: (response: unknown) => void
        ) => {
          callCount++;
          if (callCount === 1) {
            // 첫 번째 탭 실패 시뮬레이션
            Object.defineProperty(chrome.runtime, 'lastError', {
              value: { message: 'Tab closed' },
              configurable: true
            });
          } else {
            Object.defineProperty(chrome.runtime, 'lastError', {
              value: null,
              configurable: true
            });
          }
          callback({ success: callCount !== 1 });
        }
      );

      // 에러가 발생해도 reject되지 않아야 함
      await expect(messenger.broadcast(message)).resolves.not.toThrow();

      expect(mockTabsSendMessage).toHaveBeenCalledTimes(2);

      Object.defineProperty(chrome.runtime, 'lastError', {
        value: null,
        configurable: true
      });
    });
  });

  describe('onMessage / offMessage', () => {
    it('메시지 핸들러를 등록해야 함', () => {
      const handler: MessageHandler<{ data: string }, string> = jest
        .fn()
        .mockResolvedValue('response');

      messenger.onMessage(MessageType.ANALYZE_REQUEST, handler);

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('등록된 핸들러가 해당 타입의 메시지를 처리해야 함', async () => {
      const handler: MessageHandler<{ data: string }, string> = jest
        .fn()
        .mockResolvedValue('processed');

      messenger.onMessage(MessageType.ANALYZE_REQUEST, handler);

      // 메시지 시뮬레이션
      const message: Message<{ data: string }> = {
        type: MessageType.ANALYZE_REQUEST,
        payload: { data: 'test' },
        timestamp: Date.now()
      };

      const sendResponse = jest.fn();
      const sender: chrome.runtime.MessageSender = { tab: { id: 1 } as chrome.tabs.Tab };

      // 등록된 콜백 호출
      const callback = addListenerCallbacks[0];
      const shouldKeepChannel = callback?.(message, sender, sendResponse);

      // 비동기 핸들러이므로 true를 반환해야 함
      expect(shouldKeepChannel).toBe(true);

      // 핸들러 호출 대기
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledWith({ data: 'test' }, 1);
    });

    it('핸들러가 없는 메시지 타입은 무시해야 함', () => {
      const handler: MessageHandler = jest.fn();
      messenger.onMessage(MessageType.ANALYZE_REQUEST, handler);

      const message: Message = {
        type: MessageType.GET_STATUS, // 다른 타입
        payload: {},
        timestamp: Date.now()
      };

      const sendResponse = jest.fn();
      const sender: chrome.runtime.MessageSender = {};

      const callback = addListenerCallbacks[0];
      callback?.(message, sender, sendResponse);

      expect(handler).not.toHaveBeenCalled();
    });

    it('메시지 핸들러를 해제할 수 있어야 함', () => {
      const handler: MessageHandler = jest.fn();

      messenger.onMessage(MessageType.ANALYZE_REQUEST, handler);
      messenger.offMessage(MessageType.ANALYZE_REQUEST);

      // 메시지를 보내도 핸들러가 호출되지 않아야 함
      const message: Message = {
        type: MessageType.ANALYZE_REQUEST,
        payload: {},
        timestamp: Date.now()
      };

      const sendResponse = jest.fn();
      const sender: chrome.runtime.MessageSender = {};

      const callback = addListenerCallbacks[0];
      callback?.(message, sender, sendResponse);

      expect(handler).not.toHaveBeenCalled();
    });

    it('핸들러 에러 시 에러 응답을 반환해야 함', async () => {
      const handler: MessageHandler = jest
        .fn()
        .mockRejectedValue(new Error('Handler error'));

      messenger.onMessage(MessageType.ANALYZE_REQUEST, handler);

      const message: Message = {
        type: MessageType.ANALYZE_REQUEST,
        payload: {},
        timestamp: Date.now()
      };

      const sendResponse = jest.fn();
      const sender: chrome.runtime.MessageSender = { tab: { id: 1 } as chrome.tabs.Tab };

      const callback = addListenerCallbacks[0];
      callback?.(message, sender, sendResponse);

      // 비동기 처리 대기
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Handler error'
        })
      );
    });
  });
});
