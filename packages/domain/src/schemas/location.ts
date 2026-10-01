import {z} from "zod"; 



export const CreateLocation = z.object({
    name : z.string().min(1, "Name is required"),
    phone_number : z.string().min(1, "Phone number is required"),
    email : z.string().email("Email must be valid"),
    address : z.string().min(1, "Address is required"),
})



export type CreateLocationInput = z.infer<typeof CreateLocation>;