import { z } from "zod";

export const CreatePayment = z.object({
  payment_method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]),
  transaction_reference: z.string().trim().max(200).optional(),
});

export type CreatePaymentInput = z.infer<typeof CreatePayment>;
