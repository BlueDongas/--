/**
 * ============================================================================
 * 파일: IMessenger.ts (포트/인터페이스)
 * ============================================================================
 *
 * [역할]
 * 확장 프로그램의 각 부분(Content Script, Background, Popup) 간
 * 메시지 통신 인터페이스를 정의합니다.
 *
 * [비유]
 * "사내 메신저 시스템"과 같습니다:
 * - 각 부서(Content, Background, Popup)가 메시지를 주고받음
 * - 메시지 유형(MessageType)에 따라 다른 처리
 *
 * [Chrome 확장 프로그램 구조 이해]
 * - Content Script: 웹페이지에 삽입되어 실행 (DOM 접근 가능)
 * - Background (Service Worker): 백그라운드에서 항상 실행 (API 호출 등)
 * - Popup: 확장 아이콘 클릭 시 표시되는 UI
 * - 이들은 서로 다른 실행 환경이므로 메시지로 통신해야 함
 *
 * [MessageType - 메시지 종류]
 * Content → Background:
 * - SENSITIVE_INPUT: 민감 입력 발생 알림
 * - ANALYZE_REQUEST: 네트워크 요청 분석 요청
 * - USER_ACTION: 사용자 허용/차단 액션
 *
 * Background → Content:
 * - ANALYSIS_RESULT: 분석 결과 전달
 * - SHOW_WARNING: 경고창 표시 요청
 *
 * Popup ↔ Background:
 * - GET_STATUS: 보안 상태 조회
 * - GET_EVENTS: 이벤트 목록 조회
 * - UPDATE_SETTINGS: 설정 변경
 *
 * [다른 파일과의 관계]
 * - ChromeMessenger.ts: Chrome API 기반 실제 구현
 * - content/index.ts: Content Script에서 메시지 전송
 * - MessageHandler.ts: Background에서 메시지 수신/처리
 * - popup.ts: Popup에서 메시지 전송
 *
 * [흐름 예시]
 * 사용자 카드번호 입력 → Content가 SENSITIVE_INPUT 전송
 * → Background가 수신 → 최근 입력 목록에 추가
 * ============================================================================
 */

/**
 * 메시지 타입 열거형
 */
export enum MessageType {
  // Content Script → Background
  SENSITIVE_INPUT = 'SENSITIVE_INPUT',
  ANALYZE_REQUEST = 'ANALYZE_REQUEST',
  GET_STATE = 'GET_STATE',
  USER_ACTION = 'USER_ACTION',

  // Background → Content Script
  ANALYSIS_RESULT = 'ANALYSIS_RESULT',
  STATE_UPDATE = 'STATE_UPDATE',
  SHOW_WARNING = 'SHOW_WARNING',

  // Popup ↔ Background
  GET_STATUS = 'GET_STATUS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  GET_EVENTS = 'GET_EVENTS',
  CLEAR_DATA = 'CLEAR_DATA'
}

/**
 * 기본 메시지 인터페이스
 */
export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
  tabId?: number;
  timestamp: number;
}

/**
 * 메시지 응답 인터페이스
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 메시지 핸들러 타입
 */
export type MessageHandler<TPayload = unknown, TResponse = unknown> = (
  payload: TPayload,
  tabId?: number
) => Promise<TResponse> | TResponse;

/**
 * 메신저 인터페이스
 */
export interface IMessenger {
  /**
   * 메시지 전송 (Background → Content Script)
   */
  sendToTab<T, R>(tabId: number, message: Message<T>): Promise<MessageResponse<R>>;

  /**
   * 메시지 전송 (Content Script/Popup → Background)
   */
  sendToBackground<T, R>(message: Message<T>): Promise<MessageResponse<R>>;

  /**
   * 모든 탭에 메시지 브로드캐스트
   */
  broadcast<T>(message: Message<T>): Promise<void>;

  /**
   * 메시지 핸들러 등록
   */
  onMessage<TPayload, TResponse>(
    type: MessageType,
    handler: MessageHandler<TPayload, TResponse>
  ): void;

  /**
   * 메시지 핸들러 해제
   */
  offMessage(type: MessageType): void;
}
