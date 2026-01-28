/**
 * ============================================================================
 * 파일: detectionThresholds.ts
 * ============================================================================
 *
 * [역할]
 * 탐지 로직에서 사용하는 임계값(threshold) 상수들을 정의합니다.
 * 이 값들을 조정하면 탐지 민감도를 변경할 수 있습니다.
 *
 * [비유]
 * "검사 기준표"와 같습니다:
 * - 몇 초 이내를 "즉시"로 볼 것인가?
 * - 신뢰도 몇 % 이상을 "위험"으로 볼 것인가?
 *
 * [정의된 상수 그룹들]
 *
 * TIME_THRESHOLDS (시간 임계값):
 * - IMMEDIATE_TRANSFER_MS (500ms): 즉시 전송으로 간주하는 시간
 *   → D001 규칙에서 사용 (입력 후 500ms 이내 전송 = 위험)
 * - RECENT_INPUT_MS (5000ms): 최근 입력으로 간주하는 시간
 * - SESSION_TIMEOUT_MS (30분): 세션 만료 시간
 * - EVENT_RETENTION_MS (24시간): 이벤트 보관 기간
 *
 * CONFIDENCE_THRESHOLDS (신뢰도 임계값):
 * - DANGEROUS_MIN (0.8): 위험 판정 최소 신뢰도
 * - SUSPICIOUS_MIN (0.5): 의심 판정 최소 신뢰도
 * - AI_ANALYSIS_TRIGGER (0.6): AI 분석 시작 기준
 *
 * RULE_PRIORITIES (규칙 우선순위):
 * - CRITICAL (100): 최우선 (D001, D002 등)
 * - HIGH (80): 높음
 * - MEDIUM (50): 중간
 * - LOW (20): 낮음
 *
 * PAYLOAD_THRESHOLDS (페이로드 크기):
 * - MIN_SUSPICIOUS_SIZE (50 bytes): 의심 최소 크기
 * - CARD_DATA_SIZE (100 bytes): 카드 정보 추정 크기
 *
 * UI_CONSTANTS (UI 관련):
 * - MAX_DISPLAY_EVENTS (50): 표시할 최대 이벤트 수
 * - WARNING_AUTO_CLOSE_MS (10초): 경고창 자동 닫힘
 *
 * ANALYSIS_CONSTANTS (분석 관련):
 * - AI_TIMEOUT_MS (10초): AI 분석 타임아웃
 * - MAX_RETRIES (3): 최대 재시도 횟수
 *
 * [다른 파일과의 관계]
 * - DangerRules.ts: 시간 임계값 사용
 * - DetectionOrchestrator.ts: 신뢰도 임계값 사용
 * - EventList.ts: UI 상수 사용
 * ============================================================================
 */

/**
 * 시간 관련 임계값 (밀리초)
 */
export const TIME_THRESHOLDS = Object.freeze({
  /** 민감 입력 후 즉시 전송으로 간주하는 시간 */
  IMMEDIATE_TRANSFER_MS: 500,

  /** 최근 입력으로 간주하는 시간 */
  RECENT_INPUT_MS: 5000,

  /** 세션 타임아웃 */
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30분

  /** 이벤트 보관 기간 */
  EVENT_RETENTION_MS: 24 * 60 * 60 * 1000 // 24시간
});

/**
 * 신뢰도 임계값
 */
export const CONFIDENCE_THRESHOLDS = Object.freeze({
  /** 위험 판정 최소 신뢰도 */
  DANGEROUS_MIN: 0.8,

  /** 의심 판정 최소 신뢰도 */
  SUSPICIOUS_MIN: 0.5,

  /** AI 분석 트리거 임계값 */
  AI_ANALYSIS_TRIGGER: 0.6,

  /** 낮은 신뢰도 경계 */
  LOW_CONFIDENCE: 0.3
});

/**
 * 규칙 우선순위 기준
 */
export const RULE_PRIORITIES = Object.freeze({
  /** 긴급 (즉시 대응 필요) */
  CRITICAL: 100,

  /** 높음 */
  HIGH: 80,

  /** 중간 */
  MEDIUM: 50,

  /** 낮음 */
  LOW: 20,

  /** 정보성 */
  INFO: 0
});

/**
 * 페이로드 크기 임계값 (바이트)
 */
export const PAYLOAD_THRESHOLDS = Object.freeze({
  /** 최소 의심 페이로드 크기 */
  MIN_SUSPICIOUS_SIZE: 50,

  /** 카드 정보 추정 크기 */
  CARD_DATA_SIZE: 100,

  /** 대용량 페이로드 */
  LARGE_PAYLOAD: 10000
});

/**
 * UI 관련 상수
 */
export const UI_CONSTANTS = Object.freeze({
  /** 최대 표시 이벤트 수 */
  MAX_DISPLAY_EVENTS: 50,

  /** 경고 모달 자동 닫힘 시간 (밀리초) */
  WARNING_AUTO_CLOSE_MS: 10000,

  /** 토스트 알림 지속 시간 (밀리초) */
  TOAST_DURATION_MS: 5000
});

/**
 * 분석 관련 상수
 */
export const ANALYSIS_CONSTANTS = Object.freeze({
  /** AI 분석 타임아웃 (밀리초) */
  AI_TIMEOUT_MS: 10000,

  /** 최대 재시도 횟수 */
  MAX_RETRIES: 3,

  /** 재시도 간격 (밀리초) */
  RETRY_INTERVAL_MS: 1000,

  /** 배치 분석 크기 */
  BATCH_SIZE: 10
});
