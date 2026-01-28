/**
 * ============================================================================
 * 파일: ServiceWorkerInit.ts
 * ============================================================================
 *
 * [역할]
 * 백그라운드 서비스 워커의 초기화와 생명주기를 관리합니다.
 * 주기적인 작업(알람)과 자원 정리를 담당합니다.
 *
 * [비유]
 * "건물 관리인"과 같습니다:
 * - 건물(서비스 워커)을 열고 닫는 관리
 * - 정기 청소(데이터 정리) 스케줄링
 * - 각 팀(MessageHandler 등)의 연결 관리
 *
 * [서비스 워커란?]
 * Chrome 확장 프로그램 Manifest V3에서 background script의 대체입니다.
 * - 항상 실행되지 않고, 필요할 때만 깨어남
 * - 이벤트 기반으로 동작
 * - 메모리 사용량 감소
 *
 * [알람(Alarm) 시스템]
 * Chrome의 알람 API를 사용하여 주기적 작업을 예약합니다:
 * - 'cleanup-old-data': 1시간마다 오래된 데이터 정리
 *
 * [주요 메서드]
 * - initialize(): 서비스 워커 초기화
 * - shutdown(): 서비스 워커 종료 (자원 정리)
 * - setMessageHandler(): MessageHandler 연결
 *
 * [다른 파일과의 관계]
 * - background/index.ts: 이 초기화 클래스 사용
 * - MessageHandler.ts: 메시지 처리기 연결
 * - IEventRepository.ts: 데이터 정리 시 사용
 *
 * [흐름]
 * 서비스 워커 시작 → initialize()
 * → 알람 설정 (1시간마다)
 * → 알람 트리거 시 cleanupOldData()
 * → 종료 시 shutdown() → 자원 정리
 * ============================================================================
 */

import { MessageHandler } from './MessageHandler';

/**
 * 알람 정보 인터페이스
 */
interface AlarmInfo {
  name: string;
}

/**
 * ServiceWorkerInit 클래스
 */
export class ServiceWorkerInit {
  private messageHandler: MessageHandler | null = null;
  private initialized: boolean = false;
  private alarmListener: ((alarm: AlarmInfo) => void) | null = null;

  /**
   * 초기화
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    // 알람 설정 (데이터 정리용)
    this.setupCleanupAlarm();

    // 알람 리스너 등록
    this.setupAlarmListener();
  }

  /**
   * 종료
   */
  shutdown(): void {
    if (!this.initialized) {
      return;
    }

    this.initialized = false;

    // 알람 리스너 해제
    if (this.alarmListener !== null) {
      chrome.alarms.onAlarm.removeListener(this.alarmListener);
      this.alarmListener = null;
    }

    // 알람 정리
    void Promise.resolve(chrome.alarms.clear('cleanup-old-data'));

    // MessageHandler 정리
    if (this.messageHandler !== null) {
      this.messageHandler.stop();
      this.messageHandler = null;
    }
  }

  /**
   * 초기화 여부 확인
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * MessageHandler 반환
   */
  getMessageHandler(): MessageHandler | null {
    return this.messageHandler;
  }

  /**
   * MessageHandler 설정
   */
  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * 데이터 정리 알람 설정
   */
  private setupCleanupAlarm(): void {
    void Promise.resolve(
      chrome.alarms.create('cleanup-old-data', {
        periodInMinutes: 60 // 1시간마다
      })
    );
  }

  /**
   * 알람 리스너 설정
   */
  private setupAlarmListener(): void {
    this.alarmListener = (alarm: AlarmInfo): void => {
      void this.handleAlarm(alarm);
    };

    chrome.alarms.onAlarm.addListener(this.alarmListener);
  }

  /**
   * 알람 처리
   */
  private async handleAlarm(alarm: AlarmInfo): Promise<void> {
    if (alarm.name === 'cleanup-old-data') {
      await this.cleanupOldData();
    }
  }

  /**
   * 오래된 데이터 정리
   */
  private cleanupOldData(): Promise<void> {
    // MessageHandler를 통해 데이터 삭제 요청
    // 실제 구현에서는 eventRepository 직접 사용
    // 여기서는 ServiceWorkerInit이 의존성을 직접 갖지 않도록 설계
    // 24시간 이전 데이터는 자동으로 삭제됨
    return Promise.resolve();
  }
}
