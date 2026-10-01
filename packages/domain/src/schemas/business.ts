import { z } from "zod";

export const CreateBusiness = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  first_name: z.string().min(1, "First name is required").max(50, "First name must be at most 50 characters"),
  last_name: z.string().min(1, "Last name is required").max(50, "Last name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),
  business_type: z.enum(["SPA", "SALON", "CLINIC", "BARBERSHOP", "OTHER"]),
});

export type CreateBusinessInput = z.infer<typeof CreateBusiness>;