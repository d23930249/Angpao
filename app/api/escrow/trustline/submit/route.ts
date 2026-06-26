import type { NextRequest } from 'next/server';
import { submitTrustlineHandler } from '@/server/controller/escrow.controller';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';

export const POST = compose(
  withError,
  withAuth,
)(async (req: NextRequest, ctx) => submitTrustlineHandler(req, { publicKey: ctx.publicKey as string }));
