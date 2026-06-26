import type { NextRequest } from 'next/server';
import { getGiftHandler } from '@/server/controller/gift.controller';
import { compose } from '@/server/middleware/compose';
import { withError } from '@/server/middleware/withError';

export const GET = compose(
  withError,
)(async (req: NextRequest, ctx) => {
  const params = await (ctx.params as Promise<{ id: string }>);
  return getGiftHandler(req, { giftId: params.id });
});
