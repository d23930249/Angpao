import type { NextRequest } from 'next/server';
import { fundGiftHandler } from '@/server/controller/gift.controller';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';

export const POST = compose(
  withError,
  withAuth,
)(async (req: NextRequest, ctx) => {
  const params = await (ctx.params as Promise<{ id: string }>);
  return fundGiftHandler(req, { giftId: params.id });
});
