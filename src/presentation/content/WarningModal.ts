/**
 * ============================================================================
 * 파일: WarningModal.ts
 * ============================================================================
 *
 * [역할]
 * 의심스러운 네트워크 활동이 감지되었을 때
 * 사용자에게 경고를 표시하는 모달(팝업 창) UI입니다.
 *
 * [비유]
 * "보안 경비원의 경고창"과 같습니다:
 * - 위험이 감지되면 즉시 사용자에게 알림
 * - 신호등 색상으로 위험도 표시 (빨강/노랑/초록)
 * - 사용자가 "허용", "차단", "닫기" 중 선택 가능
 *
 * [모달 UI 구조]
 * ┌───────────────────────────────────────┐
 * │  [X] (닫기 버튼)                      │
 * │                                       │
 * │      ⚫ ← 신호등 (빨강/노랑/초록)      │
 * │                                       │
 * │      🔴 위험 감지!                    │
 * │                                       │
 * │  "의심스러운 데이터 전송이           │
 * │   감지되었습니다"                     │
 * │                                       │
 * │  • 세부 정보 1                        │
 * │  • 세부 정보 2                        │
 * │                                       │
 * │  대상 URL: evil-site.com             │
 * │                                       │
 * │   [허용]      [차단]                  │
 * └───────────────────────────────────────┘
 *
 * [신호등 색상 의미]
 * - 🟢 초록(SAFE): 안전
 * - 🟡 노랑(SUSPICIOUS/UNKNOWN): 의심/확인 필요
 * - 🔴 빨강(DANGEROUS): 위험
 *
 * [사용자 액션]
 * - ALLOW: 요청 허용 (화이트리스트에 자동 추가)
 * - BLOCK: 요청 차단 (도메인 차단 목록에 추가)
 * - DISMISS: 모달 닫기 (아무 조치 없음)
 *
 * [주요 메서드]
 * - show(info): 경고 모달 표시 (Promise 반환)
 * - hide(): 모달 숨기기
 * - updateVerdict(verdict): 신호등 색상 변경
 *
 * [다른 파일과의 관계]
 * - content/index.ts: 이 모달 호출
 * - Verdict.ts: 위험 등급 정의
 * - ManageBlockingUseCase.ts: 사용자 액션 처리
 *
 * [접근성 (A11y)]
 * - role="dialog", aria-modal="true" 설정
 * - 키보드 ESC로 닫기 가능
 * - 포커스 관리 (열릴 때 첫 버튼에 포커스)
 * ============================================================================
 */

import { Verdict, Recommendation } from '@domain/value-objects/Verdict';

/**
 * 경고 정보 인터페이스
 */
export interface WarningInfo {
  verdict: Verdict;
  recommendation: Recommendation;
  title: string;
  message: string;
  details?: string[];
  targetUrl?: string;
}

/**
 * 사용자 액션 열거형
 */
export enum UserAction {
  ALLOW = 'allow',
  BLOCK = 'block',
  DISMISS = 'dismiss'
}

/**
 * WarningModal 클래스
 * 신호등 UI와 사용자 액션 버튼을 포함한 경고 모달을 표시합니다.
 */
export class WarningModal {
  private modalElement: HTMLElement | null = null;
  private resolvePromise: ((action: UserAction) => void) | null = null;
  private boundHandleKeydown: (event: KeyboardEvent) => void;

  constructor() {
    this.boundHandleKeydown = this.handleKeydown.bind(this);
  }

  /**
   * 모달 표시
   */
  show(info: WarningInfo): Promise<UserAction> {
    // 기존 모달이 있으면 닫기
    if (this.modalElement) {
      this.hide();
    }

    return new Promise((resolve) => {
      this.resolvePromise = resolve;

      // 모달 생성
      this.modalElement = this.createModalElement(info);
      document.body.appendChild(this.modalElement);

      // 키보드 이벤트 리스너
      document.addEventListener('keydown', this.boundHandleKeydown);

      // 포커스 설정
      const focusTarget = this.modalElement.querySelector('button');
      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus();
      }
    });
  }

  /**
   * 모달 숨기기
   */
  hide(): void {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }

    document.removeEventListener('keydown', this.boundHandleKeydown);

    // Promise resolve
    if (this.resolvePromise) {
      this.resolvePromise(UserAction.DISMISS);
      this.resolvePromise = null;
    }
  }

  /**
   * 모달 표시 여부
   */
  isVisible(): boolean {
    return this.modalElement !== null && document.body.contains(this.modalElement);
  }

  /**
   * verdict 업데이트
   */
  updateVerdict(verdict: Verdict): void {
    if (!this.modalElement) {
      return;
    }

    const trafficLight = this.modalElement.querySelector('.traffic-light');
    if (trafficLight) {
      trafficLight.classList.remove('green', 'yellow', 'red');
      trafficLight.setAttribute('data-status', this.getTrafficLightColor(verdict));
      trafficLight.classList.add(this.getTrafficLightColor(verdict));
    }
  }

  /**
   * 모달 엘리먼트 생성
   */
  private createModalElement(info: WarningInfo): HTMLElement {
    const modal = document.createElement('div');
    modal.setAttribute('data-formjacking-modal', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'fj-modal-title');

    const trafficLightColor = this.getTrafficLightColor(info.verdict);
    const isPrimaryBlock = info.recommendation === Recommendation.BLOCK;
    const isPrimaryAllow = info.recommendation === Recommendation.PROCEED;

    modal.innerHTML = `
      <style>
        [data-formjacking-modal] {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        [data-formjacking-modal] .backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
        }
        [data-formjacking-modal] .modal-content {
          position: relative;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          max-width: 420px;
          width: 90%;
          padding: 24px;
          animation: fj-modal-appear 0.2s ease-out;
        }
        @keyframes fj-modal-appear {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        [data-formjacking-modal] .traffic-light {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        [data-formjacking-modal] .traffic-light.green {
          background: #22c55e;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
        }
        [data-formjacking-modal] .traffic-light.yellow {
          background: #eab308;
          box-shadow: 0 0 20px rgba(234, 179, 8, 0.5);
        }
        [data-formjacking-modal] .traffic-light.red {
          background: #ef4444;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
        }
        [data-formjacking-modal] .traffic-light-icon {
          width: 32px;
          height: 32px;
          fill: white;
        }
        [data-formjacking-modal] h2 {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 600;
          text-align: center;
          color: #1f2937;
        }
        [data-formjacking-modal] .message {
          margin: 0 0 16px;
          font-size: 14px;
          color: #4b5563;
          text-align: center;
          line-height: 1.5;
        }
        [data-formjacking-modal] .details {
          background: #f3f4f6;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #374151;
        }
        [data-formjacking-modal] .details ul {
          margin: 0;
          padding-left: 16px;
        }
        [data-formjacking-modal] .details li {
          margin-bottom: 4px;
        }
        [data-formjacking-modal] .target-url {
          background: #fef3c7;
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #92400e;
          word-break: break-all;
        }
        [data-formjacking-modal] .buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        [data-formjacking-modal] button {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }
        [data-formjacking-modal] button:hover {
          transform: translateY(-1px);
        }
        [data-formjacking-modal] button:active {
          transform: translateY(0);
        }
        [data-formjacking-modal] button[data-action="allow"] {
          background: ${isPrimaryAllow ? '#22c55e' : '#e5e7eb'};
          color: ${isPrimaryAllow ? 'white' : '#374151'};
        }
        [data-formjacking-modal] button[data-action="allow"]:hover {
          background: ${isPrimaryAllow ? '#16a34a' : '#d1d5db'};
        }
        [data-formjacking-modal] button[data-action="block"] {
          background: ${isPrimaryBlock ? '#ef4444' : '#e5e7eb'};
          color: ${isPrimaryBlock ? 'white' : '#374151'};
        }
        [data-formjacking-modal] button[data-action="block"]:hover {
          background: ${isPrimaryBlock ? '#dc2626' : '#d1d5db'};
        }
        [data-formjacking-modal] button[data-action="dismiss"] {
          background: transparent;
          color: #6b7280;
          padding: 10px;
        }
        [data-formjacking-modal] button[data-action="dismiss"]:hover {
          background: #f3f4f6;
        }
        [data-formjacking-modal] button.primary {
          font-weight: 600;
        }
        [data-formjacking-modal] button.danger {
          background: #ef4444;
          color: white;
        }
        [data-formjacking-modal] button.success {
          background: #22c55e;
          color: white;
        }
        [data-formjacking-modal] .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: transparent;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #9ca3af;
          width: auto;
          height: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        [data-formjacking-modal] .close-btn:hover {
          color: #374151;
          background: transparent;
        }
      </style>
      <div class="backdrop"></div>
      <div class="modal-content">
        <button class="close-btn" data-action="dismiss" aria-label="닫기">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
        <div class="traffic-light ${trafficLightColor}" data-status="${trafficLightColor}">
          ${this.getTrafficLightIcon(info.verdict)}
        </div>
        <h2 id="fj-modal-title">${this.escapeHtml(info.title)}</h2>
        <p class="message">${this.escapeHtml(info.message)}</p>
        ${info.details && info.details.length > 0 ? `
          <div class="details">
            <ul>
              ${info.details.map((d) => `<li>${this.escapeHtml(d)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${info.targetUrl !== undefined && info.targetUrl !== '' ? `
          <div class="target-url">
            <strong>대상 URL:</strong> ${this.escapeHtml(this.formatUrl(info.targetUrl))}
          </div>
        ` : ''}
        <div class="buttons">
          <button
            data-action="allow"
            ${isPrimaryAllow ? 'class="primary success" data-primary="true"' : ''}
            aria-label="허용"
          >
            허용
          </button>
          <button
            data-action="block"
            ${isPrimaryBlock ? 'class="primary danger" data-primary="true"' : ''}
            aria-label="차단"
          >
            차단
          </button>
        </div>
      </div>
    `;

    // 이벤트 리스너 등록
    modal.querySelector('.backdrop')?.addEventListener('click', () => {
      this.resolveAction(UserAction.DISMISS);
    });

    modal.querySelectorAll('button[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action') as UserAction;
        this.resolveAction(action);
      });
    });

    return modal;
  }

  /**
   * verdict에 따른 신호등 색상 반환
   */
  private getTrafficLightColor(verdict: Verdict): string {
    switch (verdict) {
      case Verdict.SAFE:
        return 'green';
      case Verdict.SUSPICIOUS:
      case Verdict.UNKNOWN:
        return 'yellow';
      case Verdict.DANGEROUS:
        return 'red';
      default:
        return 'yellow';
    }
  }

  /**
   * verdict에 따른 신호등 아이콘 반환
   */
  private getTrafficLightIcon(verdict: Verdict): string {
    switch (verdict) {
      case Verdict.SAFE:
        // 체크 아이콘
        return `<svg class="traffic-light-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
      case Verdict.SUSPICIOUS:
      case Verdict.UNKNOWN:
        // 느낌표 아이콘
        return `<svg class="traffic-light-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>`;
      case Verdict.DANGEROUS:
        // X 아이콘
        return `<svg class="traffic-light-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`;
      default:
        return '';
    }
  }

  /**
   * 키보드 이벤트 핸들러
   */
  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.resolveAction(UserAction.DISMISS);
    }
  }

  /**
   * 액션 resolve 및 모달 정리
   */
  private resolveAction(action: UserAction): void {
    if (this.resolvePromise) {
      const resolve = this.resolvePromise;
      this.resolvePromise = null;

      // 모달 제거
      if (this.modalElement) {
        this.modalElement.remove();
        this.modalElement = null;
      }

      document.removeEventListener('keydown', this.boundHandleKeydown);

      resolve(action);
    }
  }

  /**
   * HTML 이스케이프
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * URL 포맷팅 (도메인 강조)
   */
  private formatUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url;
    }
  }
}
