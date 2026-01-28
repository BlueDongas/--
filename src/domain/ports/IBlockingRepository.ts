/**
 * ============================================================================
 * 파일: IBlockingRepository.ts (포트/인터페이스)
 * ============================================================================
 *
 * [역할]
 * 도메인 차단 기능의 "인터페이스"를 정의합니다.
 * 실제 구현은 DeclarativeNetRequestBlockingRepository.ts에 있습니다.
 *
 * [비유]
 * "출입금지 명단 관리자"와 같습니다:
 * - 어떤 도메인을 차단할지 등록하고
 * - 차단 목록을 조회하고 관리
 *
 * [Chrome의 Declarative Net Request API 이해]
 * - Chrome 확장 프로그램이 네트워크 요청을 차단하는 공식 방법
 * - 규칙(Rule)을 등록하면 해당 패턴의 요청을 자동 차단
 * - manifest.json에 "declarativeNetRequest" 권한 필요
 *
 * [BlockedDomainInfo - 차단 정보]
 * - ruleId: Chrome API의 규칙 ID
 * - domain: 차단된 도메인
 * - blockedAt: 차단 시간
 * - reason: 차단 사유 (옵션)
 *
 * [주요 메서드]
 * - blockDomain(): 도메인 차단 (규칙 추가)
 * - unblockDomain(): 차단 해제 (규칙 제거)
 * - isBlocked(): 차단 여부 확인
 * - getBlockedDomains(): 차단 목록 조회
 * - clearAll(): 모든 차단 해제
 *
 * [다른 파일과의 관계]
 * - DeclarativeNetRequestBlockingRepository.ts: 실제 Chrome API 구현
 * - ManageBlockingUseCase.ts: 차단 관리 유즈케이스
 * - WarningModal.ts: "차단" 버튼 클릭 시 호출
 *
 * [흐름]
 * 경고창에서 "차단" 클릭 → ManageBlockingUseCase → blockDomain()
 * → Chrome에 차단 규칙 등록 → 해당 도메인 요청 자동 차단
 * ============================================================================
 */

/**
 * 차단된 도메인 정보
 */
export interface BlockedDomainInfo {
  /** 차단 규칙 ID */
  ruleId: number;
  /** 차단된 도메인 */
  domain: string;
  /** 차단 시간 (타임스탬프) */
  blockedAt: number;
  /** 차단 사유 */
  reason?: string;
}

/**
 * 차단 저장소 인터페이스
 */
export interface IBlockingRepository {
  /**
   * 도메인 차단
   * @param domain 차단할 도메인
   * @param reason 차단 사유 (선택)
   */
  blockDomain(domain: string, reason?: string): Promise<void>;

  /**
   * 도메인 차단 해제
   * @param domain 차단 해제할 도메인
   */
  unblockDomain(domain: string): Promise<void>;

  /**
   * 도메인이 차단되어 있는지 확인
   * @param domain 확인할 도메인
   */
  isBlocked(domain: string): Promise<boolean>;

  /**
   * 차단된 모든 도메인 목록 조회
   */
  getBlockedDomains(): Promise<BlockedDomainInfo[]>;

  /**
   * 모든 차단 규칙 삭제
   */
  clearAll(): Promise<void>;
}
