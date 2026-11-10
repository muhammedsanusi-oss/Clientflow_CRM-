/*
 * Code guide: apps/worker/src/index.ts
 * Separate background process started by pnpm dev. Polls the jobs queue through the Azure/Azurite adapter.
 * The current placeholder handler logs and discards messages; there are no implemented business job handlers.
 */
// The background worker. Polls the jobs queue and processes messages.
// Boilerplate — minimal polling skeleton that logs received messages and
// discards them. Example branches add typed handlers (thumbnail generation,
// etc.) by matching on message.type and calling handle functions.
/*
 * Import connection: @project/services -> packages/services/src/index.ts.
 * queueClient: Creates the Azure Queue SDK client using the configured connection string or the local Azurite
 * default. Defined in packages/services/src/queue.ts.
 * decodeJobMessage: Decodes base64 JSON and checks that the result is an object with a string job type before
 * a worker uses it. Defined in packages/services/src/queue.ts.
 * Type JobMessage: Type describing the queue message type field and payload properties. Defined in
 * packages/services/src/queue.ts.
 */
import { queueClient, decodeJobMessage, type JobMessage } from "@project/services";
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";

const POLL_MS = 2000;

/*
 * Current worker placeholder: logs an unhandled message type and discards it. No custom background job
 * handlers are implemented here.
 */
async function handle(msg: JobMessage): Promise<void> {
  log.warn({ type: msg.type, keys: Object.keys(msg) }, "worker: unhandled message type — discarding");
}

/*
 * Separate background process started by pnpm dev. Polls the jobs queue through the Azure/Azurite adapter.
 * The current placeholder handler logs and discards messages; there are no implemented business job handlers.
 */
async function main() {
  const q = queueClient();
  await q.createIfNotExists();
  log.info({ queue: q.name, pollMs: POLL_MS }, "worker started — waiting for jobs (Ctrl+C to stop)");

  while (true) {
    const batch = await q.receiveMessages({ numberOfMessages: 10 });
    for (const m of batch.receivedMessageItems) {
      try {
        await handle(decodeJobMessage(m.messageText));
      } catch (err) {
        log.error({ err: String(err), raw: m.messageText.slice(0, 200) }, "job failed — discarding");
      }
      await q.deleteMessage(m.messageId, m.popReceipt);
    }
    if (batch.receivedMessageItems.length === 0) {
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

main().catch((err) => {
  log.error({ err: String(err) }, "worker crashed — are Azurite and the db server running? (`pnpm dev`)");
  process.exit(1);
});