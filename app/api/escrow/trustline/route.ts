import type { NextRequest } from 'next/server';
import {
  buildTrustlineHandler,
  trustlineStatusHandler,
} from '@/server/controller/escrow.controller';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';

export const GET = compose(
  withError,
  withAuth,
)(async (req: NextRequest, ctx) => trustlineStatusHandler(req, { publicKey: ctx.publicKey as string }));

export const POST = compose(
  withError,
  withAuth,
)(async (req: NextRequest, ctx) => buildTrustlineHandler(req, { publicKey: ctx.publicKey as string }));
