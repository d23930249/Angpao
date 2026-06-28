/**
 * Next.js instrumentation hook — runs once when the server process starts.
 * Kicks off background jobs (expiry sweeper, withdrawal poller, EVM watcher).
 */
export async function register() {
  // Background jobs (setInterval-based) are OFF by default — they do not work on
  // serverless (Vercel) and are unnecessary there. Set ENABLE_BACKGROUND_JOBS=true
  // only on a long-running host to re-enable.
  if (process.env.ENABLE_BACKGROUND_JOBS !== 'true') return;
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureBootstrap } = await import('@/server/lib/bootstrap');
    ensureBootstrap();
  }
}
