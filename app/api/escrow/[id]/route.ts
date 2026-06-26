import type { NextRequest } from 'next/server';
import { getEnvelopeHandler } from '@/server/controller/escrow.controller';
import { compose } from '@/server/middleware/compose';
import { withError } from '@/server/middleware/withError';

export const GET = compose(withError)(async (req: NextRequest, ctx) => {
  const params = await (ctx.params as Promise<{ id: string }>);
  return getEnvelopeHandler(req, { envelopeId: params.id });
});
