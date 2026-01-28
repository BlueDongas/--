/**
 * TrafficLight 컴포넌트 테스트
 */

import { Verdict } from '@domain/value-objects/Verdict';

// TrafficLight 클래스 동적 로드
let TrafficLight: new (container: HTMLElement) => ITrafficLight;

interface ITrafficLight {
  render(): void;
  setStatus(verdict: Verdict): void;
  getStatus(): Verdict;
  destroy(): void;
}

describe('TrafficLight', () => {
  let container: HTMLElement;
  let trafficLight: ITrafficLight;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const module = require('@presentation/popup/components/TrafficLight');
      TrafficLight = module.TrafficLight;
      trafficLight = new TrafficLight(container);
    } catch {
      // RED 단계: 모듈이 아직 없음
      trafficLight = {
        render: jest.fn(),
        setStatus: jest.fn(),
        getStatus: jest.fn().mockReturnValue(Verdict.UNKNOWN),
        destroy: jest.fn()
      };
    }
  });

  afterEach(() => {
    trafficLight.destroy();
    container.remove();
  });

  describe('렌더링', () => {
    it('컨테이너에 신호등 요소를 렌더링해야 함', () => {
      trafficLight.render();

      const light = container.querySelector('[data-traffic-light]');
      expect(light).not.toBeNull();
    });

    it('기본 상태는 UNKNOWN이어야 함', () => {
      trafficLight.render();

      expect(trafficLight.getStatus()).toBe(Verdict.UNKNOWN);
    });

    it('신호등에 3개의 라이트가 있어야 함', () => {
      trafficLight.render();

      const lights = container.querySelectorAll('[data-light]');
      expect(lights.length).toBe(3);
    });
  });

  describe('상태 변경', () => {
    beforeEach(() => {
      trafficLight.render();
    });

    it('SAFE 상태로 변경하면 녹색 라이트가 활성화되어야 함', () => {
      trafficLight.setStatus(Verdict.SAFE);

      const greenLight = container.querySelector('[data-light="green"]');
      expect(greenLight?.classList.contains('active')).toBe(true);
    });

    it('SUSPICIOUS 상태로 변경하면 황색 라이트가 활성화되어야 함', () => {
      trafficLight.setStatus(Verdict.SUSPICIOUS);

      const yellowLight = container.querySelector('[data-light="yellow"]');
      expect(yellowLight?.classList.contains('active')).toBe(true);
    });

    it('DANGEROUS 상태로 변경하면 적색 라이트가 활성화되어야 함', () => {
      trafficLight.setStatus(Verdict.DANGEROUS);

      const redLight = container.querySelector('[data-light="red"]');
      expect(redLight?.classList.contains('active')).toBe(true);
    });

    it('UNKNOWN 상태로 변경하면 모든 라이트가 비활성화되어야 함', () => {
      trafficLight.setStatus(Verdict.UNKNOWN);

      const activeLights = container.querySelectorAll('[data-light].active');
      expect(activeLights.length).toBe(0);
    });

    it('상태 변경 후 getStatus()가 올바른 값을 반환해야 함', () => {
      trafficLight.setStatus(Verdict.DANGEROUS);

      expect(trafficLight.getStatus()).toBe(Verdict.DANGEROUS);
    });
  });

  describe('애니메이션', () => {
    beforeEach(() => {
      trafficLight.render();
    });

    it('DANGEROUS 상태에서 펄스 애니메이션 클래스가 추가되어야 함', () => {
      trafficLight.setStatus(Verdict.DANGEROUS);

      const redLight = container.querySelector('[data-light="red"]');
      expect(redLight?.classList.contains('pulse')).toBe(true);
    });

    it('SAFE 상태에서는 펄스 애니메이션이 없어야 함', () => {
      trafficLight.setStatus(Verdict.SAFE);

      const greenLight = container.querySelector('[data-light="green"]');
      expect(greenLight?.classList.contains('pulse')).toBe(false);
    });
  });

  describe('접근성', () => {
    beforeEach(() => {
      trafficLight.render();
    });

    it('role="status" 속성이 있어야 함', () => {
      const light = container.querySelector('[data-traffic-light]');
      expect(light?.getAttribute('role')).toBe('status');
    });

    it('aria-label이 현재 상태를 나타내야 함', () => {
      trafficLight.setStatus(Verdict.SAFE);

      const light = container.querySelector('[data-traffic-light]');
      expect(light?.getAttribute('aria-label')).toContain('안전');
    });

    it('DANGEROUS 상태에서 aria-live="assertive"여야 함', () => {
      trafficLight.setStatus(Verdict.DANGEROUS);

      const light = container.querySelector('[data-traffic-light]');
      expect(light?.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('라이프사이클', () => {
    it('destroy() 호출 후 컨테이너가 비워져야 함', () => {
      trafficLight.render();
      trafficLight.destroy();

      expect(container.innerHTML).toBe('');
    });

    it('여러 번 render() 호출해도 안전해야 함', () => {
      expect(() => {
        trafficLight.render();
        trafficLight.render();
        trafficLight.render();
      }).not.toThrow();

      // 신호등이 하나만 있어야 함
      const lights = container.querySelectorAll('[data-traffic-light]');
      expect(lights.length).toBe(1);
    });
  });
});
