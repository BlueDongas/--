/**
 * ============================================================================
 * 파일: DetectionEvent.ts
 * ============================================================================
 *
 * [역할]
 * 탐지 결과를 저장하는 "이벤트" 엔티티입니다.
 * 의심스러운 네트워크 요청이 발견될 때마다 이 이벤트가 생성되어 저장됩니다.
 * 팝업의 "이벤트 목록"에 표시되는 데이터입니다.
 *
 * [비유]
 * 보안 카메라의 "녹화 기록"과 같습니다:
 * - 언제(timestamp), 어디서(currentDomain → targetDomain)
 * - 어떤 의심 행위(verdict, reason)가 발생했는지 기록
 *
 * [저장하는 정보]
 * - verdict: 판정 결과 (SAFE, SUSPICIOUS, DANGEROUS, UNKNOWN)
 * - confidence: 신뢰도 (0~1)
 * - reason: 탐지 이유
 * - recommendation: 권장 조치
 * - matchedRuleId: 매칭된 규칙 ID
 * - requestId: 원본 네트워크 요청 ID
 * - requestType: 요청 유형 (FETCH, XHR 등)
 * - targetDomain: 데이터가 전송되는 대상 도메인
 * - currentDomain: 현재 페이지 도메인
 * - timestamp: 탐지 시간
 *
 * [주요 함수]
 * - createDetectionEvent(): 새 이벤트 생성 (유효성 검사 포함)
 * - isDangerousEvent(): 위험한 이벤트인지 확인
 * - findMostSevereEvent(): 배열에서 가장 심각한 이벤트 찾기
 * - toJSON(): JSON 직렬화 (IndexedDB 저장용)
 *
 * [다른 파일과의 관계]
 * - DetectionOrchestrator.ts: 분석 완료 후 DetectionEvent 생성
 * - IndexedDBEventRepository.ts: 이벤트 저장/조회
 * - EventList.ts: 팝업에서 이벤트 목록 표시
 * - GetSecurityStatusUseCase.ts: 보안 상태 계산 시 이벤트 조회
 *
 * [흐름]
 * 네트워크 분석 → DetectionEvent 생성 → IndexedDB 저장
 * → 팝업 열 때 조회 → EventList에 표시
 * ============================================================================
 */

import { NetworkRequestType } from '@domain/entities/NetworkRequest';
import { Verdict, Recommendation } from '@domain/value-objects/Verdict';

/**
 * DetectionEvent 생성 Props
 */
export interface DetectionEventProps {
  verdict: Verdict;
  confidence: number;
  reason: string;
  recommendation: Recommendation;
  matchedRuleId?: string;
  requestId: string;
  requestType: NetworkRequestType;
  targetDomain: string;
  currentDomain: string;
  timestamp: number;
}

/**
 * DetectionEvent 엔티티 인터페이스
 */
export interface DetectionEvent extends Readonly<DetectionEventProps> {
  readonly id: string;
  toJSON(): DetectionEventJSON;
}

/**
 * DetectionEvent JSON 직렬화 타입
 */
export interface DetectionEventJSON {
  id: string;
  verdict: Verdict;
  confidence: number;
  reason: string;
  recommendation: Recommendation;
  matchedRuleId?: string;
  requestId: string;
  requestType: NetworkRequestType;
  targetDomain: string;
  currentDomain: string;
  timestamp: number;
}

/**
 * 고유 ID 생성
 */
function generateId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * DetectionEvent 생성 함수
 */
export function createDetectionEvent(props: DetectionEventProps): DetectionEvent {
  // 유효성 검사
  if (props.confidence < 0 || props.confidence > 1) {
    throw new Error('confidence는 0과 1 사이여야 합니다');
  }

  if (props.reason.trim() === '') {
    throw new Error('reason은 비어있을 수 없습니다');
  }

  if (props.targetDomain.trim() === '') {
    throw new Error('targetDomain은 비어있을 수 없습니다');
  }

  if (props.currentDomain.trim() === '') {
    throw new Error('currentDomain은 비어있을 수 없습니다');
  }

  const id = generateId();

  // toJSON 메서드 정의
  const toJSON = (): DetectionEventJSON => {
    const json: DetectionEventJSON = {
      id,
      verdict: props.verdict,
      confidence: props.confidence,
      reason: props.reason,
      recommendation: props.recommendation,
      requestId: props.requestId,
      requestType: props.requestType,
      targetDomain: props.targetDomain,
      currentDomain: props.currentDomain,
      timestamp: props.timestamp
    };
    if (props.matchedRuleId !== undefined) {
      json.matchedRuleId = props.matchedRuleId;
    }
    return json;
  };

  // 기본 객체 속성
  const baseProps = {
    id,
    verdict: props.verdict,
    confidence: props.confidence,
    reason: props.reason,
    recommendation: props.recommendation,
    requestId: props.requestId,
    requestType: props.requestType,
    targetDomain: props.targetDomain,
    currentDomain: props.currentDomain,
    timestamp: props.timestamp,
    toJSON
  };

  // matchedRuleId가 있을 때만 추가
  const detectionEvent: DetectionEvent = Object.freeze(
    props.matchedRuleId !== undefined
      ? { ...baseProps, matchedRuleId: props.matchedRuleId }
      : baseProps
  ) as DetectionEvent;

  return detectionEvent;
}

/**
 * 위험한 이벤트인지 확인
 */
export function isDangerousEvent(event: DetectionEvent): boolean {
  return event.verdict === Verdict.DANGEROUS;
}

/**
 * 이벤트 배열에서 가장 심각한 이벤트 찾기
 */
export function findMostSevereEvent(
  events: readonly DetectionEvent[]
): DetectionEvent | undefined {
  if (events.length === 0) {
    return undefined;
  }

  const severityOrder: Record<Verdict, number> = {
    [Verdict.DANGEROUS]: 3,
    [Verdict.SUSPICIOUS]: 2,
    [Verdict.UNKNOWN]: 1,
    [Verdict.SAFE]: 0
  };

  return events.reduce((mostSevere, current) =>
    severityOrder[current.verdict] > severityOrder[mostSevere.verdict]
      ? current
      : mostSevere
  );
}
