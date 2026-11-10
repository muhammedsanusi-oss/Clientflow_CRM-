/*
 * Code guide: packages/log/src/index.ts
 * Shared structured logger. LOG_LEVEL controls verbosity; all applications can write consistent JSON
 * diagnostics without each creating a separate logger.
 */
// Shared pino logger. One logger for the whole codebase — every package and
// app imports from here instead of creating their own. Controlled by LOG_LEVEL.
/*
 * Import connection: pino.
 * Structured JSON logging library; writes diagnostics using the shared configured log level.
 */
import pino from "pino";

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

export const log = pino({ level });