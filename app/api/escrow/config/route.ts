import type { NextRequest } from 'next/server';
import { escrowConfigHandler } from '@/server/controller/escrow.controller';
import { compose } from '@/server/middleware/compose';
import { withError } from '@/server/middleware/withError';

export const GET = compose(withError)(async (_req: NextRequest) => escrowConfigHandler());
