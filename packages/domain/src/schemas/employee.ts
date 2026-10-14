import { z } from "zod";

export const CreateEmployee = z.object({
    firstName: z.string().min(1, "First name is required").max(50, "First name must be at most 50 characters"),
    lastName: z.string().min(1, "Last name is required").max(50, "Last name must be at most 50 characters"),
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    phone_number: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),
    role: z.enum(["OWNER", "MANAGER", "STAFF"])
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployee>;
