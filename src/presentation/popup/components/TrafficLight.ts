/**
 * ============================================================================
 * 파일: TrafficLight.ts
 * ============================================================================
 *
 * [역할]
 * 확장 프로그램 팝업에서 현재 페이지의 보안 상태를
 * 신호등 형태의 시각적 UI로 표시합니다.
 *
 * [비유]
 * "교통 신호등"과 같습니다:
 * - 🟢 초록불: 지나가도 됨 (안전)
 * - 🟡 노란불: 주의하며 진행 (의심스러움)
 * - 🔴 빨간불: 멈춰! (위험)
 *
 * [시각적 표현]
 * ```
 * ┌─────────────┐
 * │   ⚫ RED    │  ← DANGEROUS일 때 활성화 + 깜빡임
 * │   ⚫ YELLOW │  ← SUSPICIOUS/UNKNOWN일 때 활성화
 * │   ⚫ GREEN  │  ← SAFE일 때 활성화
 * └─────────────┘
 * ```
 *
 * [상태별 표시]
 * | Verdict    | 활성화 색상 | 특수 효과      |
 * |------------|------------|---------------|
 * | SAFE       | 초록       | 없음           |
 * | SUSPICIOUS | 노랑       | 없음           |
 * | DANGEROUS  | 빨강       | 펄스 애니메이션 |
 * | UNKNOWN    | 없음       | 모두 비활성화   |
 *
 * [접근성 (A11y)]
 * - role="status": 스크린 리더에게 상태 정보임을 알림
 * - aria-live="polite/assertive": 상태 변경 시 알림
 * - aria-label: "상태: 안전/의심/위험/확인 중"
 *
 * [주요 메서드]
 * - render(): 신호등 UI 렌더링
 * - setStatus(verdict): 상태 설정
 * - getStatus(): 현재 상태 반환
 * - destroy(): 컴포넌트 제거
 *
 * [다른 파일과의 관계]
 * - popup/popup.ts: 이 컴포넌트 사용
 * - Verdict.ts: 상태 열거형
 * - popup.css: 스타일 정의
 *
 * [흐름]
 * render() → 3개 라이트 생성 → updateDisplay()
 * → setStatus() 호출 시 → updateDisplay()
 * → 해당 색상 라이트에 'active' 클래스 추가
 * ============================================================================
 */

import { Verdict } from '@domain/value-objects/Verdict';

/**
 * TrafficLight 클래스
 */
export class TrafficLight {
  private container: HTMLElement;
  private status: Verdict = Verdict.UNKNOWN;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 신호등 렌더링
   */
  render(): void {
    // 기존 요소가 있으면 제거
    if (this.element !== null) {
      this.element.remove();
    }

    this.element = document.createElement('div');
    this.element.setAttribute('data-traffic-light', 'true');
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.className = 'traffic-light';

    // 3개의 라이트 생성
    const colors = ['red', 'yellow', 'green'] as const;
    for (const color of colors) {
      const light = document.createElement('div');
      light.setAttribute('data-light', color);
      light.className = `light light-${color}`;
      this.element.appendChild(light);
    }

    this.container.appendChild(this.element);
    this.updateDisplay();
  }

  /**
   * 상태 설정
   */
  setStatus(verdict: Verdict): void {
    this.status = verdict;
    this.updateDisplay();
  }

  /**
   * 현재 상태 반환
   */
  getStatus(): Verdict {
    return this.status;
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
  }

  /**
   * 디스플레이 업데이트
   */
  private updateDisplay(): void {
    if (this.element === null) {
      return;
    }

    // 모든 라이트 비활성화
    const lights = this.element.querySelectorAll('[data-light]');
    lights.forEach((light) => {
      light.classList.remove('active', 'pulse');
    });

    // 상태에 따른 라이트 활성화
    let activeColor: string | null = null;
    let ariaLabel = '상태: ';
    let ariaLive = 'polite';

    switch (this.status) {
      case Verdict.SAFE:
        activeColor = 'green';
        ariaLabel += '안전';
        break;
      case Verdict.SUSPICIOUS:
        activeColor = 'yellow';
        ariaLabel += '의심';
        break;
      case Verdict.DANGEROUS:
        activeColor = 'red';
        ariaLabel += '위험';
        ariaLive = 'assertive';
        break;
      case Verdict.UNKNOWN:
      default:
        ariaLabel += '확인 중';
        break;
    }

    if (activeColor !== null) {
      const activeLight = this.element.querySelector(`[data-light="${activeColor}"]`);
      if (activeLight !== null) {
        activeLight.classList.add('active');

        // DANGEROUS 상태에서만 펄스 애니메이션
        if (this.status === Verdict.DANGEROUS) {
          activeLight.classList.add('pulse');
        }
      }
    }

    this.element.setAttribute('aria-label', ariaLabel);
    this.element.setAttribute('aria-live', ariaLive);
  }
}
