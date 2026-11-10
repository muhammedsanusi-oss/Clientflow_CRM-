/*
 * Code guide: packages/services/src/notify.ts
 * PostgreSQL LISTEN/NOTIFY adapter for optional live events. One shared listener dispatches callbacks by
 * entity ID. Callers must authorize subscriptions; ordinary website publication currently relies on
 * refresh/revalidation.
 */
// Live event subscription via Postgres LISTEN/NOTIFY. One shared connection
// fans out pg_notify payloads to all SSE streams in the web app.
// The channel is generic; this branch scopes events by entityId = userId, so
// one /api/events stream carries everything the signed-in user should hear.
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";
/*
 * Import connection: pg.
 * Node PostgreSQL driver for direct SQL connections. Connection settings come from this module server/client
 * configuration.
 */
import { Client } from "pg";

const CHANNEL = "events";

// The wire shape: who it's for (entityId), what happened (type), when (at),
// plus any extra fields the emitter wants the browser to have (todoId, title…).
// Type contract: StageEvent. Describes values accepted/returned by the code below; TypeScript removes this
// declaration from the runtime bundle.
export type StageEvent = { entityId: string; type: string; at: string } & Record<string, unknown>;

/*
 * Serializes a live-event payload with entity ID, event type, timestamp, and optional additional fields.
 */
export function stagePayload(
  entityId: string,
  type: string,
  extra: Record<string, unknown> = {}
): string {
  return JSON.stringify({ entityId, type, at: new Date().toISOString(), ...extra });
}

let listener: Client | null = null;
// Type contract: Handler. Describes values accepted/returned by the code below; TypeScript removes this
// declaration from the runtime bundle.
type Handler = (n: StageEvent) => void;

/*
 * Opens the shared PostgreSQL LISTEN connection, registers an entity-specific callback, and returns an
 * unsubscribe function. This adapter itself does not authorize a user.
 */
export async function onStage(entityId: string, handler: Handler): Promise<() => void> {
  if (!listener) {
    const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:15432/postgres";
    listener = new Client({ connectionString: url });
    await listener.connect();
    await listener.query(`LISTEN "${CHANNEL}"`);
    listener.on("notification", (msg) => {
      try {
        const n = JSON.parse(msg.payload ?? "{}");
        callbacks.forEach((cb) => cb(n));
      } catch { /* ignore malformed payloads */ }
    });
    log.info({ channel: CHANNEL }, "subscribed to pg_notify channel");
  }

  const cb = (n: StageEvent) => {
    if (n.entityId === entityId) handler(n);
  };
  callbacks.add(cb);
  return () => { callbacks.delete(cb); };
}

const callbacks = new Set<Handler>();
