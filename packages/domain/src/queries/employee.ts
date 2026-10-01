import { prisma } from "@project/db";
import { CreateEmployeeInput } from "../schemas/employee";

export function createEmployee(businessId: string, userId: string, input: CreateEmployeeInput) {
    return prisma.employee.create({
        data: {
            business_id: businessId,
            user_id: userId,
            first_name: input.firstName,
            last_name: input.lastName,
            email: input.email,
            phone_number: input.phone_number,
            role: input.role,
            hire_date: new Date(),
        },
    });
}