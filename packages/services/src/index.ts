/*
 * Code guide: packages/services/src/index.ts
 * Service-adapter entry point for blob storage, jobs, and live database events. These are reusable
 * infrastructure helpers; current website content and inquiries are stored in PostgreSQL.
 */
// Re-exports the three service adapters: queue (background jobs), storage (blobs),
// and notify (live database events). Import from @project/services, never from the SDK directly.
// Re-export connection: { queueClient, enqueue, type JobMessage, encodeJobMessage, decodeJobMessage } ->
// packages/services/src/queue.ts. Importing this entry exposes definitions; it does not call them.
export { queueClient, enqueue, type JobMessage, encodeJobMessage, decodeJobMessage } from "./queue";
// Re-export connection: { uploadAttachment, downloadAttachment, storageAvailable, safeBlobName,
// uploadWebsiteImage, downloadWebsiteImage, websiteImageExtension, isWebsiteImageSection,
// MAX_ATTACHMENT_BYTES, MAX_WEBSITE_IMAGE_BYTES, and WebsiteImageSection } -> packages/services/src/storage.ts. Importing this entry exposes definitions; it does
// not call them.
export {
  uploadAttachment,
  downloadAttachment,
  uploadWebsiteImage,
  downloadWebsiteImage,
  websiteImageExtension,
  isWebsiteImageSection,
  storageAvailable,
  safeBlobName,
  MAX_ATTACHMENT_BYTES,
  MAX_WEBSITE_IMAGE_BYTES,
  type WebsiteImageSection,
} from "./storage";
// Re-export connection: { stagePayload, onStage, type StageEvent } -> packages/services/src/notify.ts.
// Importing this entry exposes definitions; it does not call them.
export { stagePayload, onStage, type StageEvent } from "./notify";
