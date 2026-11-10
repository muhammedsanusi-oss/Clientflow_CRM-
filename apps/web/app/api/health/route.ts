/*
 * Code guide: apps/web/app/api/health/route.ts
 * GET /api/health: unauthenticated process/database health probe. Runs SELECT 1 and returns 200 when
 * reachable or 503 with db:error when the database is unavailable.
 */
// Health check endpoint. Probes that the process is alive and the database
// is reachable. Called by Azure's load balancer probes in production (Week 10).

/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";

// Request-time rendering: the page/API is resolved for this request instead of serving one static response
// for every user.
export const dynamic = "force-dynamic";

/*
 * GET handler. GET /api/health: unauthenticated process/database health probe. Runs SELECT 1 and returns 200
 * when reachable or 503 with db:error when the database is unavailable.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok" });
  } catch (error) {
    log.error({ err: error }, "health check database probe failed");
    return Response.json({ status: "ok", db: "error" }, { status: 503 });
  }
}
