import { z } from "zod";

export const CreateCustomer = z.object({
  first_name: z.string().min(1, "First name is required").max(50, "First name must be at most 50 characters"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name must be at most 50 characters"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  preferred_contact_method: z.enum(["PHONE", "EMAIL", "TEXT"]),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomer>;