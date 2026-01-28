/**
 * IndexedDBEventRepository 테스트
 */

import 'fake-indexeddb/auto';

import {
  createDetectionEvent,
  DetectionEvent
} from '@domain/entities/DetectionEvent';
import { NetworkRequestType } from '@domain/entities/NetworkRequest';
import { Recommendation, Verdict } from '@domain/value-objects/Verdict';
import { IndexedDBEventRepository } from '@infrastructure/repositories/IndexedDBEventRepository';

describe('IndexedDBEventRepository', () => {
  let repository: IndexedDBEventRepository;

  /**
   * 테스트용 이벤트 생성 헬퍼
   */
  function createTestEvent(
    overrides: Partial<{
      verdict: Verdict;
      targetDomain: string;
      currentDomain: string;
      timestamp: number;
    }> = {}
  ): DetectionEvent {
    return createDetectionEvent({
      verdict: overrides.verdict ?? Verdict.DANGEROUS,
      confidence: 0.9,
      reason: '테스트 이유',
      recommendation: Recommendation.BLOCK,
      matchedRuleId: 'D001',
      requestId: `req-${Date.now()}-${Math.random()}`,
      requestType: NetworkRequestType.FETCH,
      targetDomain: overrides.targetDomain ?? 'malicious.example.com',
      currentDomain: overrides.currentDomain ?? 'shop.example.com',
      timestamp: overrides.timestamp ?? Date.now()
    });
  }

  beforeEach(async () => {
    // 각 테스트마다 새 데이터베이스 인스턴스 생성
    const dbName = `formjacking-test-${Date.now()}-${Math.random()}`;
    repository = new IndexedDBEventRepository(dbName);
    await repository.initialize();
  });

  afterEach(async () => {
    // 테스트 후 정리
    await repository.deleteAll();
    await repository.close();
  });

  describe('save', () => {
    it('이벤트를 저장해야 함', async () => {
      const event = createTestEvent();

      await repository.save(event);

      const found = await repository.findById(event.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(event.id);
    });

    it('동일한 ID의 이벤트를 업데이트해야 함', async () => {
      const event = createTestEvent();
      await repository.save(event);

      // 같은 이벤트를 다시 저장 (upsert)
      await repository.save(event);

      const count = await repository.count();
      expect(count).toBe(1);
    });
  });

  describe('findById', () => {
    it('존재하는 이벤트를 찾아야 함', async () => {
      const event = createTestEvent();
      await repository.save(event);

      const found = await repository.findById(event.id);

      expect(found).not.toBeNull();
      expect(found?.verdict).toBe(event.verdict);
      expect(found?.confidence).toBe(event.confidence);
      expect(found?.reason).toBe(event.reason);
    });

    it('존재하지 않는 ID에 대해 null을 반환해야 함', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findByFilter', () => {
    beforeEach(async () => {
      // 테스트 데이터 설정
      const events = [
        createTestEvent({
          verdict: Verdict.DANGEROUS,
          targetDomain: 'malicious1.com',
          timestamp: 1000
        }),
        createTestEvent({
          verdict: Verdict.SUSPICIOUS,
          targetDomain: 'suspicious.com',
          timestamp: 2000
        }),
        createTestEvent({
          verdict: Verdict.SAFE,
          targetDomain: 'safe.com',
          timestamp: 3000
        }),
        createTestEvent({
          verdict: Verdict.DANGEROUS,
          targetDomain: 'malicious2.com',
          timestamp: 4000
        })
      ];

      for (const event of events) {
        await repository.save(event);
      }
    });

    it('verdict로 필터링해야 함', async () => {
      const result = await repository.findByFilter({
        verdict: Verdict.DANGEROUS
      });

      expect(result.length).toBe(2);
      result.forEach((e) => expect(e.verdict).toBe(Verdict.DANGEROUS));
    });

    it('도메인으로 필터링해야 함', async () => {
      const result = await repository.findByFilter({
        domain: 'malicious1.com'
      });

      expect(result.length).toBe(1);
      expect(result[0]?.targetDomain).toBe('malicious1.com');
    });

    it('타임스탬프 범위로 필터링해야 함', async () => {
      const result = await repository.findByFilter({
        fromTimestamp: 1500,
        toTimestamp: 3500
      });

      expect(result.length).toBe(2);
    });

    it('여러 조건을 조합해야 함', async () => {
      const result = await repository.findByFilter({
        verdict: Verdict.DANGEROUS,
        fromTimestamp: 3000
      });

      expect(result.length).toBe(1);
      expect(result[0]?.targetDomain).toBe('malicious2.com');
    });

    it('limit을 적용해야 함', async () => {
      const result = await repository.findByFilter({ limit: 2 });

      expect(result.length).toBe(2);
    });

    it('빈 필터에 대해 모든 이벤트를 반환해야 함', async () => {
      const result = await repository.findByFilter({});

      expect(result.length).toBe(4);
    });
  });

  describe('findByDomain', () => {
    beforeEach(async () => {
      const events = [
        createTestEvent({ targetDomain: 'api.example.com', timestamp: 1000 }),
        createTestEvent({ targetDomain: 'api.example.com', timestamp: 2000 }),
        createTestEvent({ targetDomain: 'other.com', timestamp: 3000 })
      ];

      for (const event of events) {
        await repository.save(event);
      }
    });

    it('특정 도메인의 이벤트를 찾아야 함', async () => {
      const result = await repository.findByDomain('api.example.com');

      expect(result.length).toBe(2);
      result.forEach((e) => expect(e.targetDomain).toBe('api.example.com'));
    });

    it('limit을 적용해야 함', async () => {
      const result = await repository.findByDomain('api.example.com', 1);

      expect(result.length).toBe(1);
    });

    it('존재하지 않는 도메인에 대해 빈 배열을 반환해야 함', async () => {
      const result = await repository.findByDomain('nonexistent.com');

      expect(result.length).toBe(0);
    });
  });

  describe('findRecent', () => {
    beforeEach(async () => {
      const events = [
        createTestEvent({ timestamp: 1000 }),
        createTestEvent({ timestamp: 3000 }),
        createTestEvent({ timestamp: 2000 }),
        createTestEvent({ timestamp: 5000 }),
        createTestEvent({ timestamp: 4000 })
      ];

      for (const event of events) {
        await repository.save(event);
      }
    });

    it('최근 이벤트를 타임스탬프 내림차순으로 반환해야 함', async () => {
      const result = await repository.findRecent(3);

      expect(result.length).toBe(3);
      expect(result[0]?.timestamp).toBe(5000);
      expect(result[1]?.timestamp).toBe(4000);
      expect(result[2]?.timestamp).toBe(3000);
    });

    it('전체 개수보다 큰 limit에 대해 모든 이벤트를 반환해야 함', async () => {
      const result = await repository.findRecent(100);

      expect(result.length).toBe(5);
    });

    it('limit이 0이면 빈 배열을 반환해야 함', async () => {
      const result = await repository.findRecent(0);

      expect(result.length).toBe(0);
    });
  });

  describe('delete', () => {
    it('특정 이벤트를 삭제해야 함', async () => {
      const event = createTestEvent();
      await repository.save(event);

      await repository.delete(event.id);

      const found = await repository.findById(event.id);
      expect(found).toBeNull();
    });

    it('존재하지 않는 ID 삭제 시 오류를 발생시키지 않아야 함', async () => {
      await expect(
        repository.delete('non-existent-id')
      ).resolves.not.toThrow();
    });
  });

  describe('deleteOlderThan', () => {
    beforeEach(async () => {
      const events = [
        createTestEvent({ timestamp: 1000 }),
        createTestEvent({ timestamp: 2000 }),
        createTestEvent({ timestamp: 3000 }),
        createTestEvent({ timestamp: 4000 }),
        createTestEvent({ timestamp: 5000 })
      ];

      for (const event of events) {
        await repository.save(event);
      }
    });

    it('특정 시간 이전의 이벤트를 삭제하고 삭제 개수를 반환해야 함', async () => {
      const deletedCount = await repository.deleteOlderThan(3000);

      expect(deletedCount).toBe(2);

      const remaining = await repository.count();
      expect(remaining).toBe(3);
    });

    it('삭제할 이벤트가 없으면 0을 반환해야 함', async () => {
      const deletedCount = await repository.deleteOlderThan(500);

      expect(deletedCount).toBe(0);
    });

    it('모든 이벤트가 기준보다 오래되었으면 모두 삭제해야 함', async () => {
      const deletedCount = await repository.deleteOlderThan(10000);

      expect(deletedCount).toBe(5);

      const remaining = await repository.count();
      expect(remaining).toBe(0);
    });
  });

  describe('deleteAll', () => {
    it('모든 이벤트를 삭제해야 함', async () => {
      const events = [
        createTestEvent(),
        createTestEvent(),
        createTestEvent()
      ];

      for (const event of events) {
        await repository.save(event);
      }

      await repository.deleteAll();

      const count = await repository.count();
      expect(count).toBe(0);
    });

    it('이벤트가 없을 때도 오류 없이 실행되어야 함', async () => {
      await expect(repository.deleteAll()).resolves.not.toThrow();
    });
  });

  describe('count', () => {
    it('이벤트 개수를 반환해야 함', async () => {
      const events = [
        createTestEvent(),
        createTestEvent(),
        createTestEvent()
      ];

      for (const event of events) {
        await repository.save(event);
      }

      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('이벤트가 없으면 0을 반환해야 함', async () => {
      const count = await repository.count();
      expect(count).toBe(0);
    });
  });

  describe('exportAll', () => {
    it('모든 이벤트를 JSON 형태로 내보내야 함', async () => {
      const event1 = createTestEvent({ timestamp: 1000 });
      const event2 = createTestEvent({ timestamp: 2000 });
      await repository.save(event1);
      await repository.save(event2);

      const exported = await repository.exportAll();

      expect(exported.length).toBe(2);
      expect(exported[0]).toHaveProperty('id');
      expect(exported[0]).toHaveProperty('verdict');
      expect(exported[0]).toHaveProperty('confidence');
      expect(exported[0]).toHaveProperty('reason');
      expect(exported[0]).toHaveProperty('timestamp');
    });

    it('이벤트가 없으면 빈 배열을 반환해야 함', async () => {
      const exported = await repository.exportAll();

      expect(exported).toEqual([]);
    });
  });

  describe('데이터 무결성', () => {
    it('저장 후 조회한 이벤트가 원본과 동일해야 함', async () => {
      const original = createTestEvent();
      await repository.save(original);

      const retrieved = await repository.findById(original.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(original.id);
      expect(retrieved?.verdict).toBe(original.verdict);
      expect(retrieved?.confidence).toBe(original.confidence);
      expect(retrieved?.reason).toBe(original.reason);
      expect(retrieved?.recommendation).toBe(original.recommendation);
      expect(retrieved?.matchedRuleId).toBe(original.matchedRuleId);
      expect(retrieved?.requestId).toBe(original.requestId);
      expect(retrieved?.requestType).toBe(original.requestType);
      expect(retrieved?.targetDomain).toBe(original.targetDomain);
      expect(retrieved?.currentDomain).toBe(original.currentDomain);
      expect(retrieved?.timestamp).toBe(original.timestamp);
    });

    it('matchedRuleId가 없는 이벤트도 올바르게 저장/조회되어야 함', async () => {
      const event = createDetectionEvent({
        verdict: Verdict.SAFE,
        confidence: 1.0,
        reason: '안전함',
        recommendation: Recommendation.ALLOW,
        requestId: 'req-123',
        requestType: NetworkRequestType.XHR,
        targetDomain: 'safe.com',
        currentDomain: 'mysite.com',
        timestamp: Date.now()
      });

      await repository.save(event);
      const retrieved = await repository.findById(event.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.matchedRuleId).toBeUndefined();
    });
  });
});
