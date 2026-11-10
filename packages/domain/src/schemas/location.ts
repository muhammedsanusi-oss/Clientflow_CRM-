/*
 * Code guide: packages/domain/src/schemas/location.ts
 * Validates business-location contact/address input for the location API. The server supplies the owning
 * business after checking membership.
 */
/*
 * Import connection: zod.
 * Zod builds runtime validation schemas and infers TypeScript input types; it does not connect to storage.
 */
import {z} from "zod"; 



// Validates business-location contact/address input for the location API. The server supplies the owning
// business after checking membership.
export const CreateLocation = z.object({
    name : z.string().min(1, "Name is required"),
    phone_number : z.string().min(1, "Phone number is required"),
    email : z.string().email("Email must be valid"),
    address : z.string().min(1, "Address is required"),
})



// Type contract: CreateLocationInput. Describes values accepted/returned by the code below; TypeScript
// removes this declaration from the runtime bundle.
export type CreateLocationInput = z.infer<typeof CreateLocation>;