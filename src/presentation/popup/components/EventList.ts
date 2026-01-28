/**
 * ============================================================================
 * 파일: EventList.ts
 * ============================================================================
 *
 * [역할]
 * 확장 프로그램 팝업에서 최근 탐지된 이벤트들의 목록을 표시합니다.
 * 사용자가 어떤 의심스러운 활동이 감지되었는지 확인할 수 있습니다.
 *
 * [비유]
 * "보안 로그 뷰어"와 같습니다:
 * - 최근 경고/알림 기록을 시간순으로 표시
 * - 각 항목의 위험도를 색상으로 표시
 * - 클릭하면 상세 정보 확인 가능
 *
 * [이벤트 항목 UI]
 * ```
 * ┌─────────────────────────────────────────────┐
 * │ [위험] suspicious.com              2분 전   │
 * │ 외부 도메인으로 민감 데이터 전송 시도      │
 * ├─────────────────────────────────────────────┤
 * │ [의심] tracking.com                5분 전   │
 * │ 알 수 없는 도메인으로 요청 감지            │
 * ├─────────────────────────────────────────────┤
 * │ [안전] trusted-cdn.com            10분 전   │
 * │ 정상적인 스크립트 로드                     │
 * └─────────────────────────────────────────────┘
 * ```
 *
 * [배지 색상]
 * - 🔴 위험 (DANGEROUS)
 * - 🟡 의심 (SUSPICIOUS)
 * - 🟢 안전 (SAFE)
 * - ⚪ 확인 중 (UNKNOWN)
 *
 * [상대 시간 표시]
 * - "방금 전" (1분 미만)
 * - "5분 전" (1~59분)
 * - "2시간 전" (1~23시간)
 * - "1일 전" (24시간 이상)
 *
 * [주요 메서드]
 * - render(): 이벤트 목록 렌더링
 * - setEvents(events): 이벤트 목록 설정
 * - onEventClick(callback): 클릭 콜백 등록
 * - destroy(): 컴포넌트 제거
 *
 * [다른 파일과의 관계]
 * - popup/popup.ts: 이 컴포넌트 사용
 * - IEventRepository.ts: 이벤트 데이터 형식
 * - Verdict.ts: 위험도 열거형
 *
 * [접근성]
 * - role="list", role="listitem" 설정
 * - tabindex="0"으로 키보드 탐색 가능
 * - Enter/Space로 항목 선택 가능
 * ============================================================================
 */

import { Verdict } from '@domain/value-objects/Verdict';

/**
 * 탐지 이벤트 요약 인터페이스
 */
export interface DetectionEventSummary {
  id: string;
  verdict: Verdict;
  targetDomain: string;
  reason: string;
  timestamp: number;
}

/**
 * 이벤트 클릭 콜백 타입
 */
export type EventClickCallback = (eventId: string) => void;

/**
 * EventList 클래스
 */
export class EventList {
  private container: HTMLElement;
  private events: DetectionEventSummary[] = [];
  private element: HTMLElement | null = null;
  private clickCallbacks: Set<EventClickCallback> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 이벤트 목록 렌더링
   */
  render(): void {
    // 기존 요소가 있으면 제거
    if (this.element !== null) {
      this.element.remove();
    }

    this.element = document.createElement('div');
    this.element.setAttribute('data-event-list', 'true');
    this.element.setAttribute('role', 'list');
    this.element.className = 'event-list';

    this.container.appendChild(this.element);
    this.updateDisplay();
  }

  /**
   * 이벤트 설정
   */
  setEvents(events: DetectionEventSummary[]): void {
    // 시간순 정렬 (최신 순)
    this.events = [...events].sort((a, b) => b.timestamp - a.timestamp);
    this.updateDisplay();
  }

  /**
   * 현재 이벤트 반환
   */
  getEvents(): DetectionEventSummary[] {
    return this.events;
  }

  /**
   * 이벤트 클릭 콜백 등록
   */
  onEventClick(callback: EventClickCallback): void {
    this.clickCallbacks.add(callback);
  }

  /**
   * 컴포넌트 제거
   */
  destroy(): void {
    if (this.element !== null) {
      this.element.remove();
      this.element = null;
    }
    this.container.innerHTML = '';
    this.clickCallbacks.clear();
  }

  /**
   * 디스플레이 업데이트
   */
  private updateDisplay(): void {
    if (this.element === null) {
      return;
    }

    this.element.innerHTML = '';

    if (this.events.length === 0) {
      this.renderEmptyState();
      return;
    }

    for (const event of this.events) {
      const item = this.createEventItem(event);
      this.element.appendChild(item);
    }
  }

  /**
   * 빈 상태 렌더링
   */
  private renderEmptyState(): void {
    if (this.element === null) {
      return;
    }

    const emptyDiv = document.createElement('div');
    emptyDiv.setAttribute('data-empty-message', 'true');
    emptyDiv.className = 'empty-message';
    emptyDiv.textContent = '탐지된 이벤트가 없습니다';
    this.element.appendChild(emptyDiv);
  }

  /**
   * 이벤트 아이템 생성
   */
  private createEventItem(event: DetectionEventSummary): HTMLElement {
    const item = document.createElement('div');
    item.setAttribute('data-event-item', 'true');
    item.setAttribute('data-event-id', event.id);
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.className = `event-item ${this.getVerdictClass(event.verdict)}`;

    // 배지
    const badge = document.createElement('span');
    badge.setAttribute('data-verdict-badge', 'true');
    badge.className = `verdict-badge ${this.getVerdictClass(event.verdict)}`;
    badge.textContent = this.getVerdictLabel(event.verdict);

    // 도메인
    const domain = document.createElement('span');
    domain.className = 'event-domain';
    domain.textContent = event.targetDomain;

    // 사유
    const reason = document.createElement('p');
    reason.className = 'event-reason';
    reason.textContent = event.reason;

    // 시간
    const time = document.createElement('span');
    time.setAttribute('data-event-time', 'true');
    time.className = 'event-time';
    time.textContent = this.formatRelativeTime(event.timestamp);

    // 헤더 (배지 + 도메인 + 시간)
    const header = document.createElement('div');
    header.className = 'event-header';
    header.appendChild(badge);
    header.appendChild(domain);
    header.appendChild(time);

    item.appendChild(header);
    item.appendChild(reason);

    // 클릭 이벤트
    item.addEventListener('click', () => {
      this.handleEventClick(event.id);
    });

    // 키보드 이벤트 (Enter/Space)
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleEventClick(event.id);
      }
    });

    return item;
  }

  /**
   * 이벤트 클릭 처리
   */
  private handleEventClick(eventId: string): void {
    this.clickCallbacks.forEach((callback) => {
      callback(eventId);
    });
  }

  /**
   * verdict에 따른 CSS 클래스
   */
  private getVerdictClass(verdict: Verdict): string {
    switch (verdict) {
      case Verdict.SAFE:
        return 'safe';
      case Verdict.SUSPICIOUS:
        return 'suspicious';
      case Verdict.DANGEROUS:
        return 'danger';
      default:
        return 'unknown';
    }
  }

  /**
   * verdict에 따른 레이블
   */
  private getVerdictLabel(verdict: Verdict): string {
    switch (verdict) {
      case Verdict.SAFE:
        return '안전';
      case Verdict.SUSPICIOUS:
        return '의심';
      case Verdict.DANGEROUS:
        return '위험';
      default:
        return '확인 중';
    }
  }

  /**
   * 상대 시간 포맷
   */
  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}일 전`;
    }
    if (hours > 0) {
      return `${hours}시간 전`;
    }
    if (minutes > 0) {
      return `${minutes}분 전`;
    }
    return '방금 전';
  }
}
