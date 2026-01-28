/**
 * ============================================================================
 * 파일: background/index.ts
 * ============================================================================
 *
 * [역할]
 * 백그라운드 서비스 워커의 진입점(Entry Point)입니다.
 * 확장 프로그램의 "두뇌"로서 모든 핵심 로직을 조율합니다.
 *
 * [비유]
 * "중앙 통제실"과 같습니다:
 * - 모든 부서(콘텐츠 스크립트, 팝업)와 통신
 * - 명령을 받아 적절한 처리기에 전달
 * - 각 탭의 상태(아이콘)를 중앙에서 관리
 * - 시스템 이벤트(탭 변경 등)에 반응
 *
 * [서비스 워커 특징]
 * Manifest V3의 서비스 워커는:
 * - 이벤트가 없으면 잠듦 (비활성화)
 * - 메시지가 오면 깨어남
 * - 상태를 전역 변수에 저장하면 안 됨 (잠들면 초기화)
 *
 * [초기화 흐름]
 * ```
 * 서비스 워커 시작
 *     ↓
 * initializeBackground()
 *     ├→ Container.initialize() - DI 컨테이너 초기화
 *     ├→ 서비스 resolve (orchestrator, useCases 등)
 *     ├→ MessageHandler 생성
 *     ├→ ServiceWorkerInit 초기화
 *     └→ 대기 중인 메시지 처리
 * ```
 *
 * [탭 이벤트 처리]
 * - tabs.onRemoved: 탭 닫힘 → 아이콘 상태 제거
 * - tabs.onUpdated: URL 변경/로드 완료 → 아이콘 업데이트
 * - tabs.onActivated: 탭 전환 → 아이콘 업데이트
 *
 * [메시지 큐]
 * 초기화 중에 도착한 메시지는 pendingMessages에 저장되었다가
 * 초기화 완료 후 순차적으로 처리됩니다.
 *
 * [아이콘 관리]
 * IconManager를 통해 각 탭의 보안 상태에 따라
 * 확장 프로그램 아이콘 색상을 변경합니다.
 *
 * [다른 파일과의 관계]
 * - Container.ts: DI 컨테이너
 * - MessageHandler.ts: 메시지 처리
 * - IconManager.ts: 아이콘 상태 관리
 * - ServiceWorkerInit.ts: 서비스 워커 초기화
 * - DetectionOrchestrator.ts: 탐지 로직
 * - content/index.ts: 콘텐츠 스크립트와 통신
 *
 * [내보내기]
 * 테스트용으로 MessageHandler와 ServiceWorkerInit를 export합니다.
 * ============================================================================
 */

/* eslint-disable no-console */

import { WhitelistActionDTO } from '@application/dto/AnalysisDTO';
import { DetectionOrchestrator } from '@application/services/DetectionOrchestrator';
import { GetSecurityStatusUseCase } from '@application/use-cases/GetSecurityStatusUseCase';
import { ManageBlockingUseCase } from '@application/use-cases/ManageBlockingUseCase';
import { ManageSettingsUseCase } from '@application/use-cases/ManageSettingsUseCase';
import { Container } from '@di/Container';
import { IEventRepository } from '@domain/ports/IEventRepository';
import { IMessenger, MessageType } from '@domain/ports/IMessenger';
import { Verdict } from '@domain/value-objects/Verdict';

import { IconManager } from './IconManager';
import { MessageHandler, MessageHandlerDeps } from './MessageHandler';
import { ServiceWorkerInit } from './ServiceWorkerInit';

// 초기화 상태 추적
let isInitialized = false;
let messageHandlerInstance: MessageHandler | null = null;
const iconManager = new IconManager();

// 대기 중인 메시지 저장
const pendingMessages: Array<{
  message: { type: MessageType; payload: unknown };
  sender: chrome.runtime.MessageSender;
  sendResponse: (response: unknown) => void;
}> = [];

// 도메인 추출 헬퍼
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// 상태에 따른 verdict 매핑
function mapStatusToVerdict(status: string): Verdict {
  switch (status) {
    case 'danger':
      return Verdict.DANGEROUS;
    case 'warning':
      return Verdict.SUSPICIOUS;
    case 'safe':
      return Verdict.SAFE;
    default:
      return Verdict.UNKNOWN;
  }
}

// 탭의 도메인 상태를 조회하여 아이콘 업데이트
async function updateTabIconByDomain(tabId: number, url: string): Promise<void> {
  if (!isInitialized || messageHandlerInstance === null) {
    return;
  }

  const domain = extractDomain(url);
  if (!domain) {
    void iconManager.updateTabIcon(tabId, Verdict.UNKNOWN);
    return;
  }

  try {
    const result = await messageHandlerInstance.handleMessage(
      MessageType.GET_STATUS,
      { currentDomain: domain },
      tabId
    ) as { overallStatus?: string } | null;

    if (result?.overallStatus) {
      const verdict = mapStatusToVerdict(result.overallStatus);
      void iconManager.updateTabIcon(tabId, verdict);
      console.log(`[FormJacking Guard] Icon updated for tab ${tabId}: ${result.overallStatus}`);
    } else {
      void iconManager.updateTabIcon(tabId, Verdict.SAFE);
    }
  } catch (error) {
    console.debug('[FormJacking Guard] Failed to get status for icon:', error);
    void iconManager.updateTabIcon(tabId, Verdict.UNKNOWN);
  }
}

// 탭 이벤트 리스너 등록
chrome.tabs.onRemoved.addListener((tabId) => {
  iconManager.removeTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // URL 변경 시 탭 상태 리셋
  if (changeInfo.url) {
    iconManager.resetTab(tabId);
  }

  // 페이지 로드 완료 시 아이콘 업데이트
  if (changeInfo.status === 'complete' && tab.url) {
    void updateTabIconByDomain(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  // 탭 활성화 시 아이콘 업데이트
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab.url) {
      return;
    }
    void updateTabIconByDomain(activeInfo.tabId, tab.url);
  });
});

// 분석 결과에서 verdict 추출하여 아이콘 업데이트
function updateIconFromResult(tabId: number | undefined, result: unknown): void {
  console.log('[FormJacking Guard] updateIconFromResult called:', { tabId, result });

  if (tabId === undefined) {
    console.log('[FormJacking Guard] tabId is undefined, skipping icon update');
    return;
  }

  const analysisResult = result as { verdict?: Verdict } | null;
  console.log('[FormJacking Guard] Extracted verdict:', analysisResult?.verdict);

  if (analysisResult?.verdict !== undefined) {
    console.log(`[FormJacking Guard] Calling iconManager.updateTabIcon with verdict: ${analysisResult.verdict}`);
    void iconManager.updateTabIcon(tabId, analysisResult.verdict);
  } else {
    console.log('[FormJacking Guard] No verdict found in result');
  }
}

// 즉시 기본 메시지 리스너 등록
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[FormJacking Guard] Message received:', message?.type);

  // 초기화가 완료되지 않았으면 대기열에 추가
  if (!isInitialized || messageHandlerInstance === null) {
    console.log('[FormJacking Guard] Not yet initialized, queuing message');
    pendingMessages.push({ message, sender, sendResponse });
    return true; // 비동기 응답을 위해 true 반환
  }

  // 초기화 완료 후 처리
  void messageHandlerInstance
    .handleMessage(message.type, message.payload, sender.tab?.id)
    .then((result) => {
      // 분석 요청인 경우 아이콘 업데이트
      if (message.type === MessageType.ANALYZE_REQUEST) {
        updateIconFromResult(sender.tab?.id, result);
      }
      sendResponse({ success: true, data: result });
    })
    .catch((error: Error) => {
      sendResponse({ success: false, error: error.message });
    });

  return true; // 비동기 응답
});

/**
 * 백그라운드 서비스 워커 초기화
 */
async function initializeBackground(): Promise<void> {
  console.log('[FormJacking Guard] Initializing background service worker...');

  try {
    // DI 컨테이너 초기화
    const container = Container.getInstance();
    container.initialize();
    console.log('[FormJacking Guard] Container initialized');

    // 서비스 해결
    const orchestrator = container.resolve<DetectionOrchestrator>('detectionOrchestrator');
    const getSecurityStatusUseCase = container.resolve<GetSecurityStatusUseCase>('getSecurityStatusUseCase');
    const manageSettingsUseCase = container.resolve<ManageSettingsUseCase>('manageSettingsUseCase');
    const manageBlockingUseCase = container.resolve<ManageBlockingUseCase>('manageBlockingUseCase');
    const eventRepository = container.resolve<IEventRepository>('eventRepository');
    const messenger = container.resolve<IMessenger>('messenger');

    console.log('[FormJacking Guard] Services resolved');

    // MessageHandler 의존성 어댑터 생성
    const deps: MessageHandlerDeps = {
      orchestrator: {
        handleSensitiveInput: (input) => orchestrator.handleSensitiveInput(input),
        analyzeNetworkRequest: (payload, tabId) => orchestrator.analyzeNetworkRequest(payload as Parameters<typeof orchestrator.analyzeNetworkRequest>[0], tabId),
        clearInputBuffer: () => orchestrator.clearInputBuffer()
      },
      getSecurityStatusUseCase: {
        execute: (currentDomain) => getSecurityStatusUseCase.execute(currentDomain)
      },
      manageSettingsUseCase: {
        getSettings: () => manageSettingsUseCase.getSettings(),
        updateSettings: (update) => manageSettingsUseCase.updateSettings(update as Parameters<typeof manageSettingsUseCase.updateSettings>[0]),
        resetSettings: () => manageSettingsUseCase.resetSettings(),
        manageWhitelist: async (action, domain) => {
          const whitelistAction: WhitelistActionDTO = { action, domain };
          await manageSettingsUseCase.manageWhitelist(whitelistAction);
        },
        getWhitelistedDomains: () => manageSettingsUseCase.getWhitelistedDomains()
      },
      manageBlockingUseCase: {
        handleUserAction: (request) => manageBlockingUseCase.handleUserAction(request)
      },
      eventRepository: {
        findRecent: (limit) => eventRepository.findRecent(limit),
        findByFilter: (filter) => eventRepository.findByFilter(filter as Parameters<typeof eventRepository.findByFilter>[0]),
        deleteAll: () => eventRepository.deleteAll(),
        deleteOlderThan: (timestamp) => eventRepository.deleteOlderThan(timestamp)
      },
      messenger: {
        onMessage: messenger.onMessage.bind(messenger),
        offMessage: messenger.offMessage.bind(messenger),
        sendToTab: (tabId: number, message: unknown) =>
          messenger.sendToTab(tabId, message as Parameters<typeof messenger.sendToTab>[1])
      }
    };

    // MessageHandler 생성 (start()는 호출하지 않음 - 직접 리스너 사용)
    messageHandlerInstance = new MessageHandler(deps);
    console.log('[FormJacking Guard] MessageHandler created');

    // ServiceWorkerInit 생성 및 초기화
    const serviceWorkerInit = new ServiceWorkerInit();
    serviceWorkerInit.setMessageHandler(messageHandlerInstance);
    serviceWorkerInit.initialize();

    isInitialized = true;
    console.log('[FormJacking Guard] Background service worker initialized successfully');

    // 대기 중인 메시지 처리
    console.log(`[FormJacking Guard] Processing ${pendingMessages.length} pending messages`);
    for (const pending of pendingMessages) {
      try {
        const result = await messageHandlerInstance.handleMessage(
          pending.message.type,
          pending.message.payload,
          pending.sender.tab?.id
        );
        pending.sendResponse({ success: true, data: result });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        pending.sendResponse({ success: false, error: errorMsg });
      }
    }
    pendingMessages.length = 0;

  } catch (error) {
    console.error('[FormJacking Guard] Failed to initialize background service worker:', error);

    // 대기 중인 메시지에 에러 응답
    for (const pending of pendingMessages) {
      pending.sendResponse({ success: false, error: 'Service worker initialization failed' });
    }
    pendingMessages.length = 0;
  }
}

// Service Worker 초기화
void initializeBackground();

// 모듈 내보내기 (테스트용)
export { MessageHandler } from './MessageHandler';
export type { MessageHandlerDeps } from './MessageHandler';
export { ServiceWorkerInit } from './ServiceWorkerInit';
