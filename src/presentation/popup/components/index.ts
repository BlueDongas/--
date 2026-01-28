/**
 * ============================================================================
 * 파일: popup/components/index.ts
 * ============================================================================
 *
 * [역할]
 * 팝업 UI 컴포넌트들을 하나의 모듈로 묶어서 내보내는 배럴(Barrel) 파일입니다.
 *
 * [비유]
 * "부품 카탈로그 표지"와 같습니다:
 * - 여러 부품(컴포넌트)을 한 곳에서 가져올 수 있게 해줌
 * - 사용자는 개별 파일 경로를 알 필요 없음
 *
 * [사용 예시]
 * ```typescript
 * // 이렇게 사용:
 * import { TrafficLight, EventList, Settings } from './components';
 *
 * // 대신에:
 * import { TrafficLight } from './components/TrafficLight';
 * import { EventList } from './components/EventList';
 * import { Settings } from './components/Settings';
 * ```
 *
 * [내보내는 항목]
 * 클래스:
 * - TrafficLight: 신호등 UI 컴포넌트
 * - EventList: 이벤트 목록 컴포넌트
 * - Settings: 설정 패널 컴포넌트
 *
 * 타입:
 * - DetectionEventSummary: 이벤트 요약 정보 타입
 * - EventClickCallback: 이벤트 클릭 콜백 타입
 * - SettingsState: 설정 상태 타입
 * - SettingsChangeCallback: 설정 변경 콜백 타입
 * - ClearDataCallback: 데이터 삭제 콜백 타입
 * - WhitelistChangeCallback: 화이트리스트 변경 콜백 타입
 *
 * [다른 파일과의 관계]
 * - popup.ts: 이 배럴 파일을 import
 * - TrafficLight.ts: 신호등 컴포넌트 원본
 * - EventList.ts: 이벤트 목록 컴포넌트 원본
 * - Settings.ts: 설정 컴포넌트 원본
 * ============================================================================
 */

export { TrafficLight } from './TrafficLight';
export { EventList } from './EventList';
export type { DetectionEventSummary, EventClickCallback } from './EventList';
export { Settings } from './Settings';
export type {
  SettingsState,
  SettingsChangeCallback,
  ClearDataCallback,
  WhitelistChangeCallback
} from './Settings';
