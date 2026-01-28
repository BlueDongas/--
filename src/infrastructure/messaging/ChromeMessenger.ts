/**
 * ============================================================================
 * 파일: ChromeMessenger.ts
 * ============================================================================
 *
 * [역할]
 * IMessenger 인터페이스의 Chrome 구현체입니다.
 * Chrome 확장 프로그램의 각 부분 간 메시지 통신을 담당합니다.
 *
 * [비유]
 * "사내 메신저 시스템"과 같습니다:
 * - 부서(Content, Background, Popup) 간 메시지 전달
 * - 메시지 유형별 담당자(핸들러) 등록
 *
 * [Chrome 확장 프로그램 통신 구조]
 *
 * ┌─────────────┐    메시지    ┌─────────────┐
 * │   Content   │ ──────────> │ Background  │
 * │   Script    │ <────────── │  (Service   │
 * └─────────────┘    응답      │   Worker)   │
 *                              └─────────────┘
 *       ↑                            ↑
 *       │         ┌─────────────┐    │
 *       └──────── │    Popup    │ ───┘
 *                 └─────────────┘
 *
 * [주요 메서드]
 *
 * sendToTab(tabId, message):
 * - Background → 특정 탭의 Content Script로 메시지 전송
 * - chrome.tabs.sendMessage() 사용
 *
 * sendToBackground(message):
 * - Content Script/Popup → Background로 메시지 전송
 * - chrome.runtime.sendMessage() 사용
 *
 * broadcast(message):
 * - Background → 모든 탭에 메시지 브로드캐스트
 *
 * onMessage(type, handler):
 * - 특정 메시지 유형에 대한 핸들러 등록
 * - Background에서 메시지 수신 시 자동 호출
 *
 * offMessage(type):
 * - 핸들러 등록 해제
 *
 * [비동기 응답 처리]
 * Chrome 메시지 API는 비동기 응답을 위해
 * 리스너에서 true를 반환해야 함
 * → sendResponse를 나중에 호출 가능
 *
 * [다른 파일과의 관계]
 * - IMessenger.ts: 구현하는 인터페이스
 * - MessageHandler.ts: 이 메신저로 핸들러 등록
 * - content/index.ts: sendToBackground() 사용
 * - popup.ts: sendToBackground() 사용
 *
 * [흐름 예시]
 * Content Script: sendToBackground({ type: ANALYZE_REQUEST, ... })
 * → ChromeMessenger 리스너가 수신
 * → 등록된 핸들러 호출 → 응답 반환
 * ============================================================================
 */

import {
  IMessenger,
  Message,
  MessageHandler,
  MessageResponse,
  MessageType
} from '@domain/ports/IMessenger';

/**
 * Chrome Messenger 구현체
 */
export class ChromeMessenger implements IMessenger {
  private handlers: Map<MessageType, MessageHandler> = new Map();
  private listener: (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => boolean | undefined;

  constructor() {
    // 메시지 리스너 설정
    this.listener = (
      message: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void
    ): boolean | undefined => {
      const handler = this.handlers.get(message.type);

      if (handler === undefined) {
        return undefined;
      }

      // 탭 ID 추출
      const tabId = sender.tab?.id;

      // 비동기 핸들러 처리
      void Promise.resolve()
        .then(() => handler(message.payload, tabId))
        .then((result) => {
          sendResponse({ success: true, data: result });
        })
        .catch((error: Error) => {
          sendResponse({ success: false, error: error.message });
        });

      // 비동기 응답을 위해 true 반환
      return true;
    };

    chrome.runtime.onMessage.addListener(this.listener);
  }

  /**
   * 메시지 전송 (Background → Content Script)
   */
  sendToTab<T, R>(
    tabId: number,
    message: Message<T>
  ): Promise<MessageResponse<R>> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response: unknown) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message ?? 'Unknown error';
          resolve({
            success: false,
            error: errorMsg
          });
          return;
        }

        const typedResponse = response as MessageResponse<R> | undefined;
        if (typedResponse === undefined) {
          resolve({
            success: false,
            error: 'No response from tab'
          });
          return;
        }

        resolve(typedResponse);
      });
    });
  }

  /**
   * 메시지 전송 (Content Script/Popup → Background)
   */
  sendToBackground<T, R>(message: Message<T>): Promise<MessageResponse<R>> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response: unknown) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message ?? 'Unknown error';
          resolve({
            success: false,
            error: errorMsg
          });
          return;
        }

        const typedResponse = response as MessageResponse<R> | undefined;
        if (typedResponse === undefined) {
          resolve({
            success: false,
            error: 'No response from background'
          });
          return;
        }

        resolve(typedResponse);
      });
    });
  }

  /**
   * 모든 탭에 메시지 브로드캐스트
   */
  broadcast<T>(message: Message<T>): Promise<void> {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const sendPromises = tabs
          .filter((tab): tab is chrome.tabs.Tab & { id: number } =>
            tab.id !== undefined
          )
          .map((tab) =>
            this.sendToTab(tab.id, message).catch(() => {
              // 개별 탭 전송 실패는 무시
            })
          );

        void Promise.all(sendPromises).then(() => {
          resolve();
        });
      });
    });
  }

  /**
   * 메시지 핸들러 등록
   */
  onMessage<TPayload, TResponse>(
    type: MessageType,
    handler: MessageHandler<TPayload, TResponse>
  ): void {
    this.handlers.set(type, handler as MessageHandler);
  }

  /**
   * 메시지 핸들러 해제
   */
  offMessage(type: MessageType): void {
    this.handlers.delete(type);
  }

  /**
   * 리스너 정리 (테스트용)
   */
  destroy(): void {
    chrome.runtime.onMessage.removeListener(this.listener);
    this.handlers.clear();
  }
}
