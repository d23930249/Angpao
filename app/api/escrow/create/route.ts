import type { NextRequest } from 'next/server';
import { createEnvelopeHandler } from '@/server/controller/escrow.controller';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';

export const POST = compose(
  withError,
  withAuth,
)(async (req: NextRequest, ctx) => createEnvelopeHandler(req, { publicKey: ctx.publicKey as string }));
