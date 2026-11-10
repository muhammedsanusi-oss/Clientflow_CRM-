/*
 * Code guide: packages/domain/src/schemas/payment.ts
 * Validates a manually recorded appointment payment method, status, and optional reference. This is not a
 * payment-provider charge or a Clientflow subscription.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import { z } from "zod";

// Validates a manually recorded appointment payment method, status, and optional reference. This is not a
// payment-provider charge or a Clientflow subscription.
export const CreatePayment = z.object({
  payment_method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]),
  transaction_reference: z.string().trim().max(200).optional(),
});

// Type contract: CreatePaymentInput. Describes values accepted/returned by the code below; TypeScript removes
// this declaration from the runtime bundle.
export type CreatePaymentInput = z.infer<typeof CreatePayment>;
