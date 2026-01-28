/**
 * ============================================================================
 * 파일: IEventRepository.ts (포트/인터페이스)
 * ============================================================================
 *
 * [역할]
 * 탐지 이벤트를 저장하고 조회하는 "저장소 인터페이스"를 정의합니다.
 * 실제 구현은 infrastructure의 IndexedDBEventRepository.ts에 있습니다.
 *
 * [비유]
 * "기록 보관소 이용 규칙"과 같습니다:
 * - 어떻게 기록을 저장하고 (save)
 * - 어떻게 조회하고 (findById, findByFilter)
 * - 어떻게 삭제할 수 있는지 (delete, deleteOlderThan) 정의
 *
 * [왜 인터페이스로 분리했나?]
 * - domain 레이어는 IndexedDB에 직접 의존하면 안 됨
 * - 나중에 다른 저장소(LocalStorage, 서버 등)로 교체 가능
 * - 테스트 시 가짜 저장소로 대체 가능
 *
 * [EventFilter - 이벤트 조회 조건]
 * - verdict: 특정 판정 결과만 조회
 * - domain: 특정 도메인만 조회
 * - fromTimestamp/toTimestamp: 기간 범위
 * - limit: 최대 조회 개수
 *
 * [주요 메서드]
 * - save(): 이벤트 저장
 * - findById(): ID로 조회
 * - findByFilter(): 조건으로 조회
 * - findByDomain(): 도메인별 조회
 * - findRecent(): 최근 이벤트 조회
 * - deleteOlderThan(): 오래된 이벤트 삭제
 * - exportAll(): 모든 이벤트 JSON 내보내기
 *
 * [다른 파일과의 관계]
 * - IndexedDBEventRepository.ts: 실제 IndexedDB 구현
 * - DetectionOrchestrator.ts: 이벤트 저장
 * - GetSecurityStatusUseCase.ts: 이벤트 조회
 * - popup.ts: 이벤트 목록 표시
 *
 * [흐름]
 * 탐지 완료 → save() → IndexedDB 저장
 * 팝업 열림 → findByFilter() → 이벤트 목록 표시
 * ============================================================================
 */

import { DetectionEvent, DetectionEventJSON } from '@domain/entities/DetectionEvent';
import { Verdict } from '@domain/value-objects/Verdict';

/**
 * 이벤트 조회 필터
 */
export interface EventFilter {
  verdict?: Verdict;
  domain?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
}

/**
 * 이벤트 저장소 인터페이스
 */
export interface IEventRepository {
  /**
   * 이벤트 저장
   */
  save(event: DetectionEvent): Promise<void>;

  /**
   * ID로 이벤트 조회
   */
  findById(id: string): Promise<DetectionEvent | null>;

  /**
   * 필터로 이벤트 목록 조회
   */
  findByFilter(filter: EventFilter): Promise<DetectionEvent[]>;

  /**
   * 도메인별 이벤트 조회
   */
  findByDomain(domain: string, limit?: number): Promise<DetectionEvent[]>;

  /**
   * 최근 이벤트 조회
   */
  findRecent(limit: number): Promise<DetectionEvent[]>;

  /**
   * 이벤트 삭제
   */
  delete(id: string): Promise<void>;

  /**
   * 특정 시간 이전의 이벤트 삭제
   */
  deleteOlderThan(timestamp: number): Promise<number>;

  /**
   * 모든 이벤트 삭제
   */
  deleteAll(): Promise<void>;

  /**
   * 이벤트 개수 조회
   */
  count(): Promise<number>;

  /**
   * 이벤트를 JSON으로 내보내기
   */
  exportAll(): Promise<DetectionEventJSON[]>;
}
