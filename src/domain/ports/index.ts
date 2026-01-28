/**
 * ============================================================================
 * 파일: domain/ports/index.ts (배럴 파일)
 * ============================================================================
 *
 * [역할]
 * ports 폴더의 모든 인터페이스를 한 곳에서 내보내는 "배럴(barrel) 파일"입니다.
 * 다른 파일에서 import할 때 편리하게 사용할 수 있습니다.
 *
 * [배럴 파일이란?]
 * 여러 모듈을 모아서 하나의 진입점으로 제공하는 파일입니다.
 *
 * [사용 예시]
 * 배럴 파일 없이:
 *   import { IDetectionEngine } from '@domain/ports/IDetectionEngine';
 *   import { IAIAnalyzer } from '@domain/ports/IAIAnalyzer';
 *
 * 배럴 파일 사용:
 *   import { IDetectionEngine, IAIAnalyzer } from '@domain/ports';
 *
 * [내보내는 인터페이스들]
 * - IDetectionEngine: 휴리스틱 탐지 엔진
 * - IAIAnalyzer: AI 분석기
 * - IEventRepository: 이벤트 저장소
 * - ISettingsRepository: 설정 저장소
 * - IMessenger: 메시지 통신
 * (IBlockingRepository는 별도로 import해야 함)
 * ============================================================================
 */

export * from './IDetectionEngine';
export * from './IAIAnalyzer';
export * from './IEventRepository';
export * from './ISettingsRepository';
export * from './IMessenger';
