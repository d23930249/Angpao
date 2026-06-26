import type { NextRequest } from 'next/server';
import { claimGiftHandler } from '@/server/controller/gift.controller';
import { compose } from '@/server/middleware/compose';
import { withError } from '@/server/middleware/withError';

export const POST = compose(
  withError,
)(async (req: NextRequest, ctx) => {
  const params = await (ctx.params as Promise<{ id: string }>);
  return claimGiftHandler(req, { giftId: params.id });
});
