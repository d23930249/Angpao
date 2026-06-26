import type { NextRequest } from 'next/server';
import {
  listActivityHandler,
  recordActivityHandler,
} from '@/server/controller/escrow.controller';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';

export const GET = compose(
  withError,
  withAuth,
)(async (req: NextRequest, ctx) => listActivityHandler(req, { publicKey: ctx.publicKey as string }));

export const POST = compose(
  withError,
  withAuth,
)(async (req: NextRequest, ctx) => recordActivityHandler(req, { publicKey: ctx.publicKey as string }));
