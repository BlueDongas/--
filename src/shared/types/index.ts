/**
 * ============================================================================
 * 파일: shared/types/index.ts (배럴 파일)
 * ============================================================================
 *
 * [역할]
 * 프로젝트 전체에서 사용하는 타입들을 한 곳에서 모아 내보내는 "배럴 파일"입니다.
 * domain 레이어의 타입들을 재내보내기(re-export)합니다.
 *
 * [비유]
 * "중앙 창고"와 같습니다:
 * - 여러 곳에 흩어진 물건(타입)들을 한 곳에 모아두고
 * - 필요한 곳에서 쉽게 가져갈 수 있게 함
 *
 * [왜 필요한가?]
 * 1. import 경로 단순화:
 *    - 없이: import { Verdict } from '@domain/value-objects/Verdict';
 *    - 있으면: import { Verdict } from '@shared/types';
 *
 * 2. 타입 변경 시 영향 최소화:
 *    - 타입 위치가 바뀌어도 이 파일만 수정하면 됨
 *
 * [내보내는 타입 분류]
 *
 * Value Objects (값 객체):
 * - SensitiveFieldType: 민감 필드 유형
 * - Verdict, Recommendation: 판정 결과
 *
 * Entities (엔티티):
 * - SensitiveInput: 민감 입력 정보
 * - NetworkRequest: 네트워크 요청
 * - DetectionEvent: 탐지 이벤트
 * - DetectionRule: 탐지 규칙
 *
 * Ports (인터페이스):
 * - IDetectionEngine, IAIAnalyzer, IEventRepository 등
 *
 * [다른 파일과의 관계]
 * - domain 레이어의 모든 public 타입을 참조
 * - presentation, application 레이어에서 주로 import
 * ============================================================================
 */

// 도메인 엔티티 재내보내기
export { SensitiveFieldType } from '@domain/value-objects/SensitiveFieldType';
export { Verdict, Recommendation } from '@domain/value-objects/Verdict';
export type { SensitiveInput, SensitiveInputProps } from '@domain/entities/SensitiveInput';
export type { NetworkRequest, NetworkRequestProps } from '@domain/entities/NetworkRequest';
export { NetworkRequestType } from '@domain/entities/NetworkRequest';
export type { DetectionEvent, DetectionEventProps, DetectionEventJSON } from '@domain/entities/DetectionEvent';
export type { DetectionRule, DetectionRuleProps, RuleCheckResult } from '@domain/entities/DetectionRule';
export { RuleCategory } from '@domain/entities/DetectionRule';

// 포트 재내보내기
export type { DetectionContext, DetectionResult, MatchedRule, IDetectionEngine } from '@domain/ports/IDetectionEngine';
export type { AIAnalysisRequest, AIAnalysisResponse, IAIAnalyzer } from '@domain/ports/IAIAnalyzer';
export type { EventFilter, IEventRepository } from '@domain/ports/IEventRepository';
export type { ExtensionSettings, ISettingsRepository } from '@domain/ports/ISettingsRepository';
export { DEFAULT_SETTINGS } from '@domain/ports/ISettingsRepository';
export type { Message, MessageResponse, MessageHandler, IMessenger } from '@domain/ports/IMessenger';
export { MessageType } from '@domain/ports/IMessenger';
