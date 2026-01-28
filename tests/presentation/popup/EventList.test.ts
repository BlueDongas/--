/**
 * EventList 컴포넌트 테스트
 */

import { Verdict } from '@domain/value-objects/Verdict';

// EventList 클래스 동적 로드
let EventList: new (container: HTMLElement) => IEventList;

interface DetectionEventSummary {
  id: string;
  verdict: Verdict;
  targetDomain: string;
  reason: string;
  timestamp: number;
}

interface IEventList {
  render(): void;
  setEvents(events: DetectionEventSummary[]): void;
  getEvents(): DetectionEventSummary[];
  onEventClick(callback: (eventId: string) => void): void;
  destroy(): void;
}

describe('EventList', () => {
  let container: HTMLElement;
  let eventList: IEventList;

  const mockEvents: DetectionEventSummary[] = [
    {
      id: 'event-1',
      verdict: Verdict.DANGEROUS,
      targetDomain: 'evil.com',
      reason: '악성 도메인으로 데이터 전송 시도',
      timestamp: Date.now() - 60000
    },
    {
      id: 'event-2',
      verdict: Verdict.SUSPICIOUS,
      targetDomain: 'unknown-cdn.com',
      reason: '의심스러운 CDN 패턴',
      timestamp: Date.now() - 120000
    },
    {
      id: 'event-3',
      verdict: Verdict.SAFE,
      targetDomain: 'stripe.com',
      reason: '알려진 결제 게이트웨이',
      timestamp: Date.now() - 180000
    }
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const module = require('@presentation/popup/components/EventList');
      EventList = module.EventList;
      eventList = new EventList(container);
    } catch {
      // RED 단계: 모듈이 아직 없음
      eventList = {
        render: jest.fn(),
        setEvents: jest.fn(),
        getEvents: jest.fn().mockReturnValue([]),
        onEventClick: jest.fn(),
        destroy: jest.fn()
      };
    }
  });

  afterEach(() => {
    eventList.destroy();
    container.remove();
  });

  describe('렌더링', () => {
    it('컨테이너에 이벤트 목록 요소를 렌더링해야 함', () => {
      eventList.render();

      const list = container.querySelector('[data-event-list]');
      expect(list).not.toBeNull();
    });

    it('이벤트가 없으면 빈 상태 메시지를 표시해야 함', () => {
      eventList.render();

      const emptyMessage = container.querySelector('[data-empty-message]');
      expect(emptyMessage).not.toBeNull();
      expect(emptyMessage?.textContent).toContain('이벤트가 없습니다');
    });
  });

  describe('이벤트 표시', () => {
    beforeEach(() => {
      eventList.render();
    });

    it('이벤트를 설정하면 목록에 표시해야 함', () => {
      eventList.setEvents(mockEvents);

      const items = container.querySelectorAll('[data-event-item]');
      expect(items.length).toBe(3);
    });

    it('각 이벤트에 verdict 배지가 있어야 함', () => {
      eventList.setEvents(mockEvents);

      const badges = container.querySelectorAll('[data-verdict-badge]');
      expect(badges.length).toBe(3);
    });

    it('DANGEROUS 이벤트는 danger 클래스를 가져야 함', () => {
      eventList.setEvents(mockEvents);

      const dangerItem = container.querySelector('[data-event-id="event-1"]');
      expect(dangerItem?.classList.contains('danger')).toBe(true);
    });

    it('이벤트에 도메인이 표시되어야 함', () => {
      eventList.setEvents(mockEvents);

      const firstItem = container.querySelector('[data-event-id="event-1"]');
      expect(firstItem?.textContent).toContain('evil.com');
    });

    it('이벤트에 사유가 표시되어야 함', () => {
      eventList.setEvents(mockEvents);

      const firstItem = container.querySelector('[data-event-id="event-1"]');
      expect(firstItem?.textContent).toContain('악성 도메인');
    });

    it('이벤트에 상대 시간이 표시되어야 함', () => {
      eventList.setEvents(mockEvents);

      const timeElement = container.querySelector('[data-event-time]');
      expect(timeElement).not.toBeNull();
    });

    it('getEvents()로 현재 이벤트를 가져올 수 있어야 함', () => {
      eventList.setEvents(mockEvents);

      expect(eventList.getEvents()).toEqual(mockEvents);
    });
  });

  describe('이벤트 클릭', () => {
    beforeEach(() => {
      eventList.render();
      eventList.setEvents(mockEvents);
    });

    it('이벤트 클릭 시 콜백이 호출되어야 함', () => {
      const callback = jest.fn();
      eventList.onEventClick(callback);

      const firstItem = container.querySelector('[data-event-id="event-1"]');
      firstItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(callback).toHaveBeenCalledWith('event-1');
    });

    it('여러 콜백을 등록할 수 있어야 함', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      eventList.onEventClick(callback1);
      eventList.onEventClick(callback2);

      const firstItem = container.querySelector('[data-event-id="event-1"]');
      firstItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('정렬', () => {
    it('이벤트가 시간순(최신 순)으로 정렬되어야 함', () => {
      eventList.render();
      eventList.setEvents(mockEvents);

      const items = container.querySelectorAll('[data-event-item]');
      const firstEventId = items[0]?.getAttribute('data-event-id');

      // 가장 최신 이벤트가 첫 번째
      expect(firstEventId).toBe('event-1');
    });
  });

  describe('접근성', () => {
    beforeEach(() => {
      eventList.render();
    });

    it('목록에 role="list" 속성이 있어야 함', () => {
      const list = container.querySelector('[data-event-list]');
      expect(list?.getAttribute('role')).toBe('list');
    });

    it('각 아이템에 role="listitem" 속성이 있어야 함', () => {
      eventList.setEvents(mockEvents);

      const items = container.querySelectorAll('[data-event-item]');
      items.forEach((item) => {
        expect(item.getAttribute('role')).toBe('listitem');
      });
    });

    it('클릭 가능한 아이템에 tabindex가 있어야 함', () => {
      eventList.setEvents(mockEvents);

      const items = container.querySelectorAll('[data-event-item]');
      items.forEach((item) => {
        expect(item.getAttribute('tabindex')).toBe('0');
      });
    });
  });

  describe('라이프사이클', () => {
    it('destroy() 호출 후 컨테이너가 비워져야 함', () => {
      eventList.render();
      eventList.setEvents(mockEvents);
      eventList.destroy();

      expect(container.innerHTML).toBe('');
    });
  });
});
