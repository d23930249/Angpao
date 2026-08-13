// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

type StoredGiftRow = { id: string; createdAt: Date };

const limitCalls: number[] = [];
let rowsForNextQuery: StoredGiftRow[] = [];

vi.mock('@/server/db/client', () => {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockImplementation((take: number) => {
    limitCalls.push(take);
    return Promise.resolve(rowsForNextQuery.slice(0, take));
  });
  return { db: { select: vi.fn(() => chain) } };
});

import {
  GIFT_PAGE_SIZE_DEFAULT,
  GIFT_PAGE_SIZE_MAX,
  listGiftsBySender,
} from '@/server/service/gift.service';

const SENDER = 'GABC';

function makeGifts(count: number): StoredGiftRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `gift-${index}`,
    createdAt: new Date(Date.UTC(2026, 7, 20 - index)),
  }));
}

beforeEach(() => {
  limitCalls.length = 0;
  rowsForNextQuery = [];
});

describe('listGiftsBySender', () => {
  it('returns a full page and a cursor when more gifts exist', async () => {
    rowsForNextQuery = makeGifts(GIFT_PAGE_SIZE_DEFAULT + 5);

    const page = await listGiftsBySender(SENDER);

    expect(page.gifts).toHaveLength(GIFT_PAGE_SIZE_DEFAULT);
    expect(page.nextCursor).toBe(
      rowsForNextQuery[GIFT_PAGE_SIZE_DEFAULT - 1]?.createdAt.toISOString(),
    );
  });

  it('reads one extra row to decide whether a next page exists', async () => {
    rowsForNextQuery = makeGifts(3);

    await listGiftsBySender(SENDER, { limit: 2 });

    expect(limitCalls).toEqual([3]);
  });

  it('returns no cursor on the last page', async () => {
    rowsForNextQuery = makeGifts(2);

    const page = await listGiftsBySender(SENDER, { limit: 5 });

    expect(page.gifts).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('never reads more than the maximum page size', async () => {
    rowsForNextQuery = makeGifts(500);

    const page = await listGiftsBySender(SENDER, { limit: 1000 });

    expect(page.gifts).toHaveLength(GIFT_PAGE_SIZE_MAX);
  });

  it('rejects a cursor that is not a date', async () => {
    rowsForNextQuery = makeGifts(1);

    await expect(listGiftsBySender(SENDER, { cursor: 'not-a-date' })).rejects.toThrow(
      'Invalid cursor',
    );
  });
});
