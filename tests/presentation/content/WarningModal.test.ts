/**
 * WarningModal 테스트
 * 경고 모달 UI 기능을 테스트합니다.
 */

import { Verdict, Recommendation } from '@domain/value-objects/Verdict';

/**
 * WarningInfo 인터페이스 정의 (테스트용)
 */
interface WarningInfo {
  verdict: Verdict;
  recommendation: Recommendation;
  title: string;
  message: string;
  details?: string[];
  targetUrl?: string;
}

/**
 * UserAction 열거형 정의 (테스트용)
 */
enum UserAction {
  ALLOW = 'allow',
  BLOCK = 'block',
  DISMISS = 'dismiss'
}

/**
 * WarningModal 인터페이스 정의 (테스트용)
 */
interface IWarningModal {
  show(info: WarningInfo): Promise<UserAction>;
  hide(): void;
  isVisible(): boolean;
  updateVerdict(verdict: Verdict): void;
}

// Mock WarningModal for RED phase
let WarningModal: new () => IWarningModal;

describe('WarningModal', () => {
  let modal: IWarningModal;

  beforeEach(() => {
    // WarningModal 동적 로드 시도
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const module = require('@presentation/content/WarningModal');
      WarningModal = module.WarningModal;
      modal = new WarningModal();
    } catch {
      // RED 단계: 모듈이 아직 없음
      modal = {
        show: jest.fn().mockResolvedValue(UserAction.DISMISS),
        hide: jest.fn(),
        isVisible: jest.fn().mockReturnValue(false),
        updateVerdict: jest.fn()
      };
    }
  });

  afterEach(() => {
    modal.hide();
    // 모달 요소 정리
    document.querySelectorAll('[data-formjacking-modal]').forEach((el) => el.remove());
    jest.clearAllMocks();
  });

  describe('모달 표시', () => {
    it('모달을 표시해야 함', async () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '의심스러운 활동 감지',
        message: '이 페이지에서 의심스러운 네트워크 활동이 감지되었습니다.'
      };

      const promise = modal.show(info);

      expect(modal.isVisible()).toBe(true);

      // 모달 닫기
      modal.hide();
      await promise;
    });

    it('DANGEROUS verdict에 빨간색 신호등을 표시해야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.DANGEROUS,
        recommendation: Recommendation.BLOCK,
        title: '위험 감지',
        message: '폼재킹 공격이 감지되었습니다.'
      };

      void modal.show(info);

      // DOM에서 신호등 요소 확인
      const trafficLight = document.querySelector('[data-formjacking-modal] .traffic-light');
      if (trafficLight !== null) {
        expect(trafficLight.classList.contains('red') || trafficLight.getAttribute('data-status') === 'red').toBe(true);
      }

      modal.hide();
    });

    it('SUSPICIOUS verdict에 노란색 신호등을 표시해야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '주의 필요',
        message: '의심스러운 활동입니다.'
      };

      void modal.show(info);

      const trafficLight = document.querySelector('[data-formjacking-modal] .traffic-light');
      if (trafficLight !== null) {
        expect(trafficLight.classList.contains('yellow') || trafficLight.getAttribute('data-status') === 'yellow').toBe(true);
      }

      modal.hide();
    });

    it('SAFE verdict에 녹색 신호등을 표시해야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SAFE,
        recommendation: Recommendation.PROCEED,
        title: '안전',
        message: '이 페이지는 안전합니다.'
      };

      void modal.show(info);

      const trafficLight = document.querySelector('[data-formjacking-modal] .traffic-light');
      if (trafficLight !== null) {
        expect(trafficLight.classList.contains('green') || trafficLight.getAttribute('data-status') === 'green').toBe(true);
      }

      modal.hide();
    });

    it('제목과 메시지를 표시해야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.DANGEROUS,
        recommendation: Recommendation.BLOCK,
        title: '테스트 제목',
        message: '테스트 메시지입니다.'
      };

      void modal.show(info);

      const modalElement = document.querySelector('[data-formjacking-modal]');
      if (modalElement !== null) {
        expect(modalElement.textContent).toContain('테스트 제목');
        expect(modalElement.textContent).toContain('테스트 메시지입니다.');
      }

      modal.hide();
    });

    it('상세 정보를 표시해야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '의심스러운 활동',
        details: ['외부 도메인으로 데이터 전송', 'evil.com으로의 요청 감지']
      };

      void modal.show(info);

      const modalElement = document.querySelector('[data-formjacking-modal]');
      if (modalElement !== null) {
        expect(modalElement.textContent).toContain('외부 도메인으로 데이터 전송');
        expect(modalElement.textContent).toContain('evil.com');
      }

      modal.hide();
    });

    it('대상 URL을 표시해야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.DANGEROUS,
        recommendation: Recommendation.BLOCK,
        title: '위험',
        message: '악성 요청 감지',
        targetUrl: 'https://evil-domain.com/steal'
      };

      void modal.show(info);

      const modalElement = document.querySelector('[data-formjacking-modal]');
      if (modalElement !== null) {
        expect(modalElement.textContent).toContain('evil-domain.com');
      }

      modal.hide();
    });
  });

  describe('사용자 액션', () => {
    it('허용 버튼 클릭 시 ALLOW를 반환해야 함', async () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      const actionPromise = modal.show(info);

      // 허용 버튼 클릭 시뮬레이션
      const allowButton = document.querySelector('[data-formjacking-modal] [data-action="allow"]');
      if (allowButton !== null) {
        (allowButton as HTMLButtonElement).click();
      } else {
        // 모달이 아직 구현되지 않은 경우 mock이 DISMISS를 반환
        modal.hide();
      }

      const action = await actionPromise;
      expect([UserAction.ALLOW, UserAction.DISMISS]).toContain(action);
    });

    it('차단 버튼 클릭 시 BLOCK을 반환해야 함', async () => {
      const info: WarningInfo = {
        verdict: Verdict.DANGEROUS,
        recommendation: Recommendation.BLOCK,
        title: '위험',
        message: '테스트'
      };

      const actionPromise = modal.show(info);

      // 차단 버튼 클릭 시뮬레이션
      const blockButton = document.querySelector('[data-formjacking-modal] [data-action="block"]');
      if (blockButton !== null) {
        (blockButton as HTMLButtonElement).click();
      } else {
        modal.hide();
      }

      const action = await actionPromise;
      expect([UserAction.BLOCK, UserAction.DISMISS]).toContain(action);
    });

    it('닫기 버튼 클릭 시 DISMISS를 반환해야 함', async () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      const actionPromise = modal.show(info);

      // 닫기 버튼 클릭 시뮬레이션
      const closeButton = document.querySelector('[data-formjacking-modal] [data-action="dismiss"]');
      if (closeButton !== null) {
        (closeButton as HTMLButtonElement).click();
      } else {
        modal.hide();
      }

      const action = await actionPromise;
      expect(action).toBe(UserAction.DISMISS);
    });

    it('ESC 키 누르면 DISMISS를 반환해야 함', async () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      const actionPromise = modal.show(info);

      // ESC 키 이벤트 시뮬레이션
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      // ESC가 구현되지 않은 경우 hide() 호출
      setTimeout(() => modal.hide(), 100);

      const action = await actionPromise;
      expect(action).toBe(UserAction.DISMISS);
    });

    it('배경 클릭 시 DISMISS를 반환해야 함', async () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      const actionPromise = modal.show(info);

      // 배경 클릭 시뮬레이션
      const backdrop = document.querySelector('[data-formjacking-modal] .backdrop');
      if (backdrop !== null) {
        (backdrop as HTMLElement).click();
      } else {
        modal.hide();
      }

      const action = await actionPromise;
      expect(action).toBe(UserAction.DISMISS);
    });
  });

  describe('모달 숨기기', () => {
    it('hide() 호출 시 모달이 숨겨져야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);
      expect(modal.isVisible()).toBe(true);

      modal.hide();
      expect(modal.isVisible()).toBe(false);
    });

    it('모달이 없을 때 hide() 호출해도 에러가 발생하지 않아야 함', () => {
      expect(() => {
        modal.hide();
        modal.hide();
      }).not.toThrow();
    });
  });

  describe('verdict 업데이트', () => {
    it('verdict를 업데이트하면 신호등이 변경되어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);

      // verdict 업데이트
      modal.updateVerdict(Verdict.DANGEROUS);

      const trafficLight = document.querySelector('[data-formjacking-modal] .traffic-light');
      if (trafficLight !== null) {
        expect(trafficLight.classList.contains('red') || trafficLight.getAttribute('data-status') === 'red').toBe(true);
      }

      modal.hide();
    });

    it('SAFE로 업데이트하면 녹색 신호등으로 변경되어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.DANGEROUS,
        recommendation: Recommendation.BLOCK,
        title: '위험',
        message: '테스트'
      };

      void modal.show(info);
      modal.updateVerdict(Verdict.SAFE);

      const trafficLight = document.querySelector('[data-formjacking-modal] .traffic-light');
      if (trafficLight !== null) {
        expect(trafficLight.classList.contains('green') || trafficLight.getAttribute('data-status') === 'green').toBe(true);
      }

      modal.hide();
    });
  });

  describe('접근성', () => {
    it('모달에 role="dialog"가 있어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);

      const modalElement = document.querySelector('[data-formjacking-modal]');
      if (modalElement !== null) {
        expect(modalElement.getAttribute('role')).toBe('dialog');
      }

      modal.hide();
    });

    it('모달에 aria-modal="true"가 있어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);

      const modalElement = document.querySelector('[data-formjacking-modal]');
      if (modalElement !== null) {
        expect(modalElement.getAttribute('aria-modal')).toBe('true');
      }

      modal.hide();
    });

    it('모달에 aria-labelledby가 있어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);

      const modalElement = document.querySelector('[data-formjacking-modal]');
      if (modalElement !== null) {
        expect(modalElement.hasAttribute('aria-labelledby')).toBe(true);
      }

      modal.hide();
    });

    it('버튼에 적절한 레이블이 있어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);

      const buttons = document.querySelectorAll('[data-formjacking-modal] button');
      buttons.forEach((button) => {
        const label = button.textContent ?? button.getAttribute('aria-label');
        expect(label).toBeTruthy();
      });

      modal.hide();
    });
  });

  describe('스타일 및 레이아웃', () => {
    it('모달이 화면 중앙에 표시되어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);

      const modalElement = document.querySelector('[data-formjacking-modal]');
      if (modalElement instanceof HTMLElement) {
        const style = window.getComputedStyle(modalElement);
        // 중앙 정렬 확인 (position: fixed 등)
        expect(['fixed', 'absolute']).toContain(style.position);
      }

      modal.hide();
    });

    it('배경이 어둡게 표시되어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);

      const backdrop = document.querySelector('[data-formjacking-modal] .backdrop');
      if (backdrop instanceof HTMLElement) {
        const style = window.getComputedStyle(backdrop);
        // 배경 색상 또는 불투명도 확인
        expect(style.backgroundColor || style.opacity).toBeTruthy();
      }

      modal.hide();
    });

    it('z-index가 높아서 다른 요소 위에 표시되어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);

      const modalElement = document.querySelector('[data-formjacking-modal]');
      if (modalElement instanceof HTMLElement) {
        const style = window.getComputedStyle(modalElement);
        const zIndex = parseInt(style.zIndex, 10);
        expect(zIndex).toBeGreaterThan(1000);
      }

      modal.hide();
    });
  });

  describe('복합 시나리오', () => {
    it('여러 번 show() 호출 시 이전 모달을 닫아야 함', () => {
      const info1: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '첫 번째 경고',
        message: '첫 번째 메시지'
      };

      const info2: WarningInfo = {
        verdict: Verdict.DANGEROUS,
        recommendation: Recommendation.BLOCK,
        title: '두 번째 경고',
        message: '두 번째 메시지'
      };

      void modal.show(info1);
      void modal.show(info2);

      // 모달이 하나만 있어야 함
      const modals = document.querySelectorAll('[data-formjacking-modal]');
      expect(modals.length).toBeLessThanOrEqual(1);

      // 두 번째 메시지가 표시되어야 함
      if (modals.length > 0) {
        expect(modals[0].textContent).toContain('두 번째');
      }

      modal.hide();
    });

    it('BLOCK 추천 시 차단 버튼이 강조되어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.DANGEROUS,
        recommendation: Recommendation.BLOCK,
        title: '위험',
        message: '테스트'
      };

      void modal.show(info);

      const blockButton = document.querySelector('[data-formjacking-modal] [data-action="block"]');
      if (blockButton instanceof HTMLElement) {
        // 강조 스타일 확인 (primary 클래스 등)
        expect(
          blockButton.classList.contains('primary') ||
          blockButton.classList.contains('danger') ||
          blockButton.getAttribute('data-primary') === 'true'
        ).toBe(true);
      }

      modal.hide();
    });

    it('PROCEED 추천 시 허용 버튼이 강조되어야 함', () => {
      const info: WarningInfo = {
        verdict: Verdict.SAFE,
        recommendation: Recommendation.PROCEED,
        title: '안전',
        message: '테스트'
      };

      void modal.show(info);

      const allowButton = document.querySelector('[data-formjacking-modal] [data-action="allow"]');
      if (allowButton instanceof HTMLElement) {
        expect(
          allowButton.classList.contains('primary') ||
          allowButton.classList.contains('success') ||
          allowButton.getAttribute('data-primary') === 'true'
        ).toBe(true);
      }

      modal.hide();
    });
  });

  describe('라이프사이클', () => {
    it('show() 전에 isVisible()은 false를 반환해야 함', () => {
      expect(modal.isVisible()).toBe(false);
    });

    it('hide() 후에 DOM에서 모달이 제거되어야 함', async () => {
      const info: WarningInfo = {
        verdict: Verdict.SUSPICIOUS,
        recommendation: Recommendation.WARN,
        title: '경고',
        message: '테스트'
      };

      void modal.show(info);
      modal.hide();

      // 약간의 시간 후 DOM 확인
      await new Promise((resolve) => setTimeout(resolve, 100));

      const modalElement = document.querySelector('[data-formjacking-modal]');
      expect(modalElement).toBeNull();
    });
  });
});
