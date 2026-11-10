/*
 * Code guide: packages/services/src/storage.ts
 * Azure Blob Storage attachment adapter, using Azurite when no connection string is configured. Bytes live in
 * blob storage, not CRM tables. These helpers are infrastructure scaffolding, not an active
 * website-image-upload screen.
 */
// The blob storage adapter. Uploads and downloads attachments from Azure Blob
// Storage (or Azurite locally). Files live in blob storage, not in the database.
/*
 * Import connection: @project/log -> packages/log/src/index.ts.
 * log: Shared pino logger from packages/log for structured server diagnostics.
 */
import { log } from "@project/log";
import { randomUUID } from "node:crypto";
/*
 * Import connection: @azure/storage-blob.
 * Azure Blob SDK for attachment containers and byte uploads/downloads; connects to Azure or the configured
 * local Azurite emulator.
 */
import { BlobServiceClient } from "@azure/storage-blob";

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "UseDevelopmentStorage=true";
const CONTAINER = "attachments";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_WEBSITE_IMAGE_BYTES = 5 * 1024 * 1024;
export type WebsiteImageSection = "header" | "hero" | "features" | "about" | "offerings" | "contact"
  | "custom";
export function isWebsiteImageSection(value: string): value is WebsiteImageSection {
  return /^(header|hero|features|about|offerings|contact|custom)$/.test(value);
}

/*
 * Validates both the declared image type and its file signature before website bytes reach blob storage.
 */
export function websiteImageExtension(contentType: string, data: Uint8Array): "jpg" | "png" | "webp" | null {
  if (data.byteLength > MAX_WEBSITE_IMAGE_BYTES) return null;
  const pngSignature = contentType === "image/png"
    && data.byteLength >= 8
    && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
    && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a;
  const png = pngSignature && isStaticPng(data);
  const jpeg = contentType === "image/jpeg"
    && data.byteLength >= 4 && data[0] === 0xff && data[1] === 0xd8
    && data[data.byteLength - 2] === 0xff && data[data.byteLength - 1] === 0xd9;
  const webpSignature = contentType === "image/webp"
    && data.byteLength >= 12
    && String.fromCharCode(...data.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...data.slice(8, 12)) === "WEBP";
  const webp = webpSignature && isStaticWebp(data);
  if (png) return "png";
  if (jpeg) return "jpg";
  if (webp) return "webp";
  return null;
}

function isStaticPng(data: Uint8Array) {
  let offset = 8;
  let hasImageData = false;
  while (offset + 12 <= data.byteLength) {
    const length = data[offset] * 0x1000000 + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3];
    if (length > data.byteLength - offset - 12) return false;
    const chunk = String.fromCharCode(...data.slice(offset + 4, offset + 8));
    if (chunk === "acTL") return false;
    if (chunk === "IDAT") hasImageData = true;
    offset += length + 12;
    if (chunk === "IEND") return hasImageData && offset === data.byteLength;
  }
  return false;
}

function isStaticWebp(data: Uint8Array) {
  const riffLength = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24);
  const end = riffLength + 8;
  if (end > data.byteLength || end < 12) return false;
  let offset = 12;
  let hasImageData = false;
  while (offset + 8 <= end) {
    const chunk = String.fromCharCode(...data.slice(offset, offset + 4));
    if (chunk === "ANIM" || chunk === "ANMF") return false;
    if (chunk === "VP8 " || chunk === "VP8L") hasImageData = true;
    const length = data[offset + 4] | (data[offset + 5] << 8) | (data[offset + 6] << 16) | (data[offset + 7] << 24);
    if (length > end - offset - 8) return false;
    offset += 8 + length + (length & 1);
  }
  return hasImageData && offset === end;
}

/*
 * Stores an authorized website section image under a unique business-scoped blob name.
 */
export async function uploadWebsiteImage(
  businessId: string,
  section: WebsiteImageSection,
  contentType: string,
  data: Uint8Array,
): Promise<string> {
  const extension = websiteImageExtension(contentType, data);
  if (!extension) throw new TypeError("Unsupported or invalid website image");
  await BlobServiceClient.fromConnectionString(CONNECTION_STRING)
    .getContainerClient(CONTAINER).createIfNotExists();
  return uploadAttachment(`${businessId}/website`, `${section}-${randomUUID()}.${extension}`, contentType, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
}

/*
 * Downloads an image only through a validated website reference; missing blobs return null and storage errors
 * remain visible to the route for explicit error handling.
 */
export async function downloadWebsiteImage(blobName: string) {
  const client = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  const blob = client.getContainerClient(CONTAINER).getBlockBlobClient(blobName);
  try {
    const response = await blob.download(0);
    if (!response.readableStreamBody) throw new Error("Image storage returned an empty stream");
    const data = new Uint8Array(await streamToBuffer(response.readableStreamBody));
    return { data, contentType: response.contentType ?? "application/octet-stream" };
  } catch (error) {
    if (error && typeof error === "object" && "errorCode" in error && error.errorCode === "BlobNotFound") return null;
    throw error;
  }
}

/*
 * Attempts to create/reach the attachment container and reports availability without exposing SDK failures.
 */
export async function storageAvailable(): Promise<boolean> {
  try {
    const client = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    await client.getContainerClient(CONTAINER).createIfNotExists();
    return true;
  } catch {
    return false;
  }
}

// Creates a safe blob name from an item id and filename.
/*
 * Sanitizes the user-supplied filename and namespaces it under the supplied item ID; callers remain
 * responsible for authorization.
 */
export function safeBlobName(itemId: string, filename: string): string {
  const safe = filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "_")
    .slice(0, 100)
    || "file";
  return `${itemId}/${safe}`;
}

/*
 * Uploads bytes and their content type to blob storage, returning the blob name for a caller to reference.
 */
export async function uploadAttachment(
  itemId: string,
  filename: string,
  contentType: string,
  data: ArrayBuffer
): Promise<string> {
  const blobName = safeBlobName(itemId, filename);
  const client = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  const blockBlob = client.getContainerClient(CONTAINER).getBlockBlobClient(blobName);
  await blockBlob.uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });
  log.info({ blobName, bytes: data.byteLength }, "uploaded blob");
  return blobName;
}

/*
 * Downloads blob bytes and a content type, or returns null when the SDK operation fails.
 */
export async function downloadAttachment(
  blobName: string
): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    const client = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    const blockBlob = client.getContainerClient(CONTAINER).getBlockBlobClient(blobName);
    const res = await blockBlob.download(0);
    const data = new Uint8Array(await streamToBuffer(res.readableStreamBody!));
    return { data, contentType: res.contentType ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

/*
 * Collects streamed blob chunks into a Node Buffer before returning downloaded bytes.
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}