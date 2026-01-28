/**
 * ============================================================================
 * 파일: DeclarativeNetRequestBlockingRepository.ts
 * ============================================================================
 *
 * [역할]
 * IBlockingRepository 인터페이스의 실제 구현체입니다.
 * Chrome Declarative Net Request API를 사용하여 도메인을 차단합니다.
 *
 * [비유]
 * "네트워크 방화벽"과 같습니다:
 * - 특정 도메인으로의 요청을 차단하는 규칙 등록
 * - Chrome이 자동으로 해당 요청을 차단
 *
 * [Declarative Net Request API란?]
 * Chrome Manifest V3에서 도입된 네트워크 요청 제어 API
 * - 규칙 기반으로 요청 차단/수정
 * - 성능이 좋고 권한이 제한적 (보안상 유리)
 * - manifest.json에 "declarativeNetRequest" 권한 필요
 *
 * [차단 규칙 구조]
 * ```typescript
 * {
 *   id: 10001,                    // 고유 규칙 ID
 *   priority: 1,
 *   action: { type: 'block' },    // 차단
 *   condition: {
 *     urlFilter: '||evil.com^',   // 도메인 패턴
 *     resourceTypes: [...]        // 차단할 리소스 유형
 *   }
 * }
 * ```
 *
 * [차단되는 리소스 유형]
 * - XMLHTTPREQUEST (Ajax)
 * - SCRIPT (JavaScript)
 * - SUB_FRAME (iframe)
 * - IMAGE, STYLESHEET, FONT, MEDIA, WEBSOCKET 등
 *
 * [데이터 저장 구조]
 * Chrome Storage에 메타데이터 저장:
 * - ruleId: Chrome 규칙 ID
 * - domain: 차단된 도메인
 * - blockedAt: 차단 시간
 * - reason: 차단 사유
 *
 * [주요 메서드]
 * - blockDomain(): 도메인 차단 (규칙 추가)
 * - unblockDomain(): 차단 해제 (규칙 제거)
 * - isBlocked(): 차단 여부 확인 (서브도메인 포함)
 * - getBlockedDomains(): 차단 목록 조회
 * - clearAll(): 모든 차단 해제
 *
 * [다른 파일과의 관계]
 * - IBlockingRepository.ts: 구현하는 인터페이스
 * - ManageBlockingUseCase.ts: 이 저장소 사용
 * - WarningModal.ts: "차단" 버튼 클릭 시 호출
 *
 * [흐름]
 * "차단" 버튼 → ManageBlockingUseCase → blockDomain()
 * → Chrome declarativeNetRequest에 규칙 등록
 * → 해당 도메인 요청 자동 차단
 * ============================================================================
 */

import {
  BlockedDomainInfo,
  IBlockingRepository
} from '@domain/ports/IBlockingRepository';

const BLOCKED_DOMAINS_STORAGE_KEY = 'blocked_domains';
const RULE_ID_START = 10000;

/**
 * 저장되는 차단 메타데이터 타입
 */
interface BlockedDomainMetadata {
  ruleId: number;
  domain: string;
  blockedAt: number;
  reason?: string;
}

/**
 * declarativeNetRequest 기반 차단 저장소 구현체
 */
export class DeclarativeNetRequestBlockingRepository implements IBlockingRepository {
  /**
   * 도메인 차단
   */
  async blockDomain(domain: string, reason?: string): Promise<void> {
    const existingDomains = await this.getBlockedDomainsMetadata();

    // 이미 차단되어 있으면 무시
    if (existingDomains.some((d) => d.domain === domain)) {
      return;
    }

    // 새 규칙 ID 생성
    const ruleId = this.generateRuleId(existingDomains);

    // declarativeNetRequest 규칙 추가
    await this.addBlockingRule(ruleId, domain);

    // 메타데이터 저장
    const metadata: BlockedDomainMetadata = {
      ruleId,
      domain,
      blockedAt: Date.now(),
      ...(reason !== undefined ? { reason } : {})
    };

    existingDomains.push(metadata);
    await this.saveBlockedDomainsMetadata(existingDomains);
  }

  /**
   * 도메인 차단 해제
   */
  async unblockDomain(domain: string): Promise<void> {
    const existingDomains = await this.getBlockedDomainsMetadata();
    const targetDomain = existingDomains.find((d) => d.domain === domain);

    if (targetDomain === undefined) {
      return;
    }

    // declarativeNetRequest 규칙 제거
    await this.removeBlockingRule(targetDomain.ruleId);

    // 메타데이터에서 제거
    const updatedDomains = existingDomains.filter((d) => d.domain !== domain);
    await this.saveBlockedDomainsMetadata(updatedDomains);
  }

  /**
   * 도메인이 차단되어 있는지 확인
   */
  async isBlocked(domain: string): Promise<boolean> {
    const existingDomains = await this.getBlockedDomainsMetadata();
    return existingDomains.some((d) => this.matchesDomain(domain, d.domain));
  }

  /**
   * 차단된 모든 도메인 목록 조회
   */
  async getBlockedDomains(): Promise<BlockedDomainInfo[]> {
    return this.getBlockedDomainsMetadata();
  }

  /**
   * 모든 차단 규칙 삭제
   */
  async clearAll(): Promise<void> {
    const existingDomains = await this.getBlockedDomainsMetadata();
    const ruleIds = existingDomains.map((d) => d.ruleId);

    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }

    await this.saveBlockedDomainsMetadata([]);
  }

  /**
   * declarativeNetRequest 차단 규칙 추가
   */
  private async addBlockingRule(ruleId: number, domain: string): Promise<void> {
    const rule: chrome.declarativeNetRequest.Rule = {
      id: ruleId,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.BLOCK
      },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          chrome.declarativeNetRequest.ResourceType.SCRIPT,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.STYLESHEET,
          chrome.declarativeNetRequest.ResourceType.FONT,
          chrome.declarativeNetRequest.ResourceType.MEDIA,
          chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
          chrome.declarativeNetRequest.ResourceType.OTHER
        ]
      }
    };

    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [rule]
    });
  }

  /**
   * declarativeNetRequest 차단 규칙 제거
   */
  private async removeBlockingRule(ruleId: number): Promise<void> {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId]
    });
  }

  /**
   * 새 규칙 ID 생성
   */
  private generateRuleId(existingDomains: BlockedDomainMetadata[]): number {
    if (existingDomains.length === 0) {
      return RULE_ID_START;
    }

    const maxId = Math.max(...existingDomains.map((d) => d.ruleId));
    return maxId + 1;
  }

  /**
   * Chrome Storage에서 차단 메타데이터 조회
   */
  private getBlockedDomainsMetadata(): Promise<BlockedDomainMetadata[]> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(BLOCKED_DOMAINS_STORAGE_KEY, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        const stored = result[BLOCKED_DOMAINS_STORAGE_KEY] as BlockedDomainMetadata[] | undefined;
        resolve(stored ?? []);
      });
    });
  }

  /**
   * Chrome Storage에 차단 메타데이터 저장
   */
  private saveBlockedDomainsMetadata(domains: BlockedDomainMetadata[]): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [BLOCKED_DOMAINS_STORAGE_KEY]: domains }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * 도메인 매칭 (서브도메인 지원)
   */
  private matchesDomain(target: string, blocked: string): boolean {
    if (target === blocked) {
      return true;
    }
    // 서브도메인 매칭: target이 blocked로 끝나고 그 앞이 .인 경우
    return target.endsWith(`.${blocked}`);
  }
}
