/**
 * ============================================================================
 * 파일: IconManager.ts
 * ============================================================================
 *
 * [역할]
 * 각 탭의 보안 상태에 따라 확장 프로그램 아이콘 색상을 관리합니다.
 * 사용자가 브라우저 툴바에서 현재 페이지의 상태를 바로 확인할 수 있게 합니다.
 *
 * [비유]
 * "신호등 관리자"와 같습니다:
 * - 각 탭(교차로)마다 신호등(아이콘) 설치
 * - 상태에 따라 색상 변경 (초록/노랑/빨강)
 * - 더 심각한 상태로만 변경 (빨강 → 노랑으로는 안 바뀜)
 *
 * [아이콘 색상]
 * - 🟢 green: 안전 (SAFE)
 * - 🟡 yellow: 의심/미확인 (SUSPICIOUS, UNKNOWN)
 * - 🔴 red: 위험 (DANGEROUS)
 * - ⚪ gray: 기본 상태
 *
 * [탭별 상태 관리]
 * ```
 * Tab 1 (google.com)     → 🟢 green
 * Tab 2 (shopping.com)   → 🟡 yellow
 * Tab 3 (suspicious.com) → 🔴 red
 * ```
 *
 * [심각도 순서]
 * SAFE(0) < UNKNOWN(1) < SUSPICIOUS(2) < DANGEROUS(3)
 *
 * 덜 심각한 상태로는 바뀌지 않습니다:
 * - 빨강 → 노랑: ❌ (무시)
 * - 노랑 → 빨강: ✅ (업데이트)
 * - 모든 상태 → 초록: ✅ (페이지 새로고침 시 리셋)
 *
 * [주요 메서드]
 * - updateTabIcon(tabId, verdict): 아이콘 업데이트
 * - resetTab(tabId): 탭 상태 리셋 (새로고침 시)
 * - removeTab(tabId): 탭 제거 (탭 닫힘 시)
 * - getTabState(tabId): 현재 상태 조회
 *
 * [다른 파일과의 관계]
 * - background/index.ts: 이 관리자 사용
 * - Verdict.ts: 상태 열거형 사용
 * - assets/icons/: 아이콘 이미지 파일들
 *
 * [아이콘 파일 구조]
 * assets/icons/
 *   ├── icon-green-16.png
 *   ├── icon-green-48.png
 *   ├── icon-green-128.png
 *   ├── icon-yellow-16.png
 *   ├── ... (각 색상별 크기)
 *   └── icon-red-128.png
 * ============================================================================
 */

import { Verdict } from '@domain/value-objects/Verdict';

/**
 * 아이콘 색상 타입
 */
type IconColor = 'green' | 'yellow' | 'red' | 'gray';

/**
 * IconManager 클래스
 */
export class IconManager {
  private tabStates: Map<number, Verdict> = new Map();

  /**
   * verdict에 따른 색상 반환
   */
  private getColorForVerdict(verdict: Verdict): IconColor {
    switch (verdict) {
      case Verdict.SAFE:
        return 'green';
      case Verdict.SUSPICIOUS:
      case Verdict.UNKNOWN:
        return 'yellow';
      case Verdict.DANGEROUS:
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * 아이콘 경로 반환
   */
  private getIconPaths(verdict: Verdict): Record<number, string> {
    const color = this.getColorForVerdict(verdict);
    return {
      16: chrome.runtime.getURL(`assets/icons/icon-${color}-16.png`),
      48: chrome.runtime.getURL(`assets/icons/icon-${color}-48.png`),
      128: chrome.runtime.getURL(`assets/icons/icon-${color}-128.png`)
    };
  }

  /**
   * verdict 심각도 반환
   */
  private getSeverity(verdict: Verdict): number {
    const severityOrder: Record<Verdict, number> = {
      [Verdict.SAFE]: 0,
      [Verdict.UNKNOWN]: 1,
      [Verdict.SUSPICIOUS]: 2,
      [Verdict.DANGEROUS]: 3
    };
    return severityOrder[verdict] ?? 0;
  }

  /**
   * 탭의 아이콘 업데이트
   */
  async updateTabIcon(tabId: number, verdict: Verdict): Promise<void> {
    const color = this.getColorForVerdict(verdict);
    const paths = this.getIconPaths(verdict);
    const currentVerdict = this.tabStates.get(tabId);

    console.log(`[IconManager] Updating icon for tab ${tabId}: verdict=${verdict}, color=${color}`);

    // 현재 상태와 같으면 업데이트 생략
    if (currentVerdict === verdict) {
      console.log('[IconManager] Same state, skipping update');
      return;
    }

    // 현재 상태보다 덜 심각하면 업데이트 생략 (단, 페이지 새로고침 시 리셋을 위해 SAFE는 허용)
    if (currentVerdict !== undefined && verdict !== Verdict.SAFE) {
      if (this.getSeverity(verdict) < this.getSeverity(currentVerdict)) {
        console.log(`[IconManager] Less severe verdict (${verdict} < ${currentVerdict}), skipping update`);
        return;
      }
    }

    this.tabStates.set(tabId, verdict);

    try {
      await chrome.action.setIcon({
        tabId,
        path: paths
      });
      console.log(`[IconManager] Icon updated successfully for tab ${tabId}`);
    } catch (error) {
      console.error('[IconManager] Failed to update icon:', error);
      this.tabStates.delete(tabId);
    }
  }

  /**
   * 탭 상태 리셋 (페이지 새로고침 시)
   */
  resetTab(tabId: number): void {
    this.tabStates.delete(tabId);
  }

  /**
   * 탭 제거
   */
  removeTab(tabId: number): void {
    this.tabStates.delete(tabId);
  }

  /**
   * 탭의 현재 상태 조회
   */
  getTabState(tabId: number): Verdict | undefined {
    return this.tabStates.get(tabId);
  }

  /**
   * 모든 탭 상태 초기화
   */
  clearAll(): void {
    this.tabStates.clear();
  }

  /**
   * 관리 중인 탭 수 반환
   */
  getTabCount(): number {
    return this.tabStates.size;
  }
}
