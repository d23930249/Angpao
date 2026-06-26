import type { NextRequest } from 'next/server';
import { createGiftHandler, listGifts } from '@/server/controller/gift.controller';
import { compose } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';

export const GET = compose(
  withError,
  withAuth,
)((req: NextRequest, ctx) => listGifts(req, ctx as { publicKey: string }));

export const POST = compose(
  withError,
  withAuth,
)((req: NextRequest, ctx) => createGiftHandler(req, ctx as { publicKey: string }));
