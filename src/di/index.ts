/**
 * ============================================================================
 * 파일: di/index.ts
 * ============================================================================
 *
 * [역할]
 * DI(의존성 주입) 모듈의 진입점(Entry Point)입니다.
 * Container와 관련 유틸리티 함수들을 외부에 노출합니다.
 *
 * [비유]
 * "창고 입구"와 같습니다:
 * - 외부에서 필요한 것만 꺼내갈 수 있게 함
 * - 내부 구현은 숨기고 필요한 인터페이스만 제공
 *
 * [내보내는 항목]
 *
 * 클래스:
 * - Container: DI 컨테이너 클래스
 *
 * 함수:
 * - getContainer(): 컨테이너 싱글톤 접근
 * - resolveService(): 서비스 해결 헬퍼
 *
 * 타입:
 * - ServiceKey: 서비스 식별자 타입 (문자열 유니온)
 * - ServiceMap: 서비스 키-타입 매핑
 *
 * [사용 예시]
 * ```typescript
 * import { Container, resolveService } from '@di';
 *
 * // 방법 1: 컨테이너 직접 사용
 * const container = Container.getInstance();
 * container.initialize();
 * const orchestrator = container.resolve('detectionOrchestrator');
 *
 * // 방법 2: 헬퍼 함수 사용
 * const orchestrator = resolveService('detectionOrchestrator');
 * ```
 *
 * [다른 파일과의 관계]
 * - Container.ts: 실제 구현 파일
 * - background/index.ts: 이 모듈을 import하여 사용
 * - tsconfig.json: '@di' 경로 별칭 설정
 * ============================================================================
 */

export {
  Container,
  getContainer,
  resolveService
} from './Container';

export type {
  ServiceKey,
  ServiceMap
} from './Container';
