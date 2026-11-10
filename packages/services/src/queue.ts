/*
 * Code guide: packages/services/src/queue.ts
 * Generic Azure Queue/Azurite job adapter. Encodes typed-by-name job messages for the worker; current CRM
 * website forms do not enqueue their edits here.
 */
// The jobs queue adapter. Wraps the Azure Storage Queue SDK so the web app
// and the worker can enqueue and consume messages without knowing the SDK shape.
// Boilerplate — generic queue seam. Example branches add typed helpers
// (enqueueItemCreated, enqueueThumbnail) on top of these primitives.
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";
/*
 * Import connection: @azure/storage-queue.
 * Azure Queue SDK used to send/receive jobs; connects to Azure or Azurite through the storage connection
 * string.
 */
import { QueueClient } from "@azure/storage-queue";

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "UseDevelopmentStorage=true";
const QUEUE_NAME = "jobs";

// Type contract: JobMessage. Describes values accepted/returned by the code below; TypeScript removes this
// declaration from the runtime bundle.
export interface JobMessage {
  type: string;
  [key: string]: unknown;
}

/*
 * Serializes a job object as base64 JSON for Azure Queue Storage.
 */
export function encodeJobMessage(msg: JobMessage): string {
  return Buffer.from(JSON.stringify(msg)).toString("base64");
}

/*
 * Decodes base64 JSON and checks that the result is an object with a string job type before a worker uses it.
 */
export function decodeJobMessage(text: string): JobMessage {
  const parsed = JSON.parse(Buffer.from(text, "base64").toString("utf8"));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("queue: decoded message is not an object");
  }
  if (typeof parsed.type !== "string") {
    throw new Error("queue: message has no type field");
  }
  return parsed as JobMessage;
}

/*
 * Creates the Azure Queue SDK client using the configured connection string or the local Azurite default.
 */
export function queueClient(): QueueClient {
  return new QueueClient(CONNECTION_STRING, QUEUE_NAME);
}

/*
 * Creates the queue if needed and sends one encoded job message. A queued job is not automatically an email
 * or website publication.
 */
export async function enqueue(type: string, payload: Record<string, unknown>): Promise<void> {
  const q = queueClient();
  await q.createIfNotExists();
  const msg: JobMessage = { type, ...payload };
  await q.sendMessage(encodeJobMessage(msg));
  log.info({ type, queue: q.name }, "queued job");
}