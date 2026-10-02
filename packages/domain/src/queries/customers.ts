// Database queries for todos. Every query is scoped by userId — no exceptions.
// A todo and its event are written in a single transaction, always.
import { prisma } from "@project/db";
import type { CreateCustomerInput } from "../schemas/customer";

export function listCustomers(business_id: string) {
return prisma.customer.findMany({
  where: { business_id },
  orderBy: { createdAt: "desc" },
});

}


export function getCustomer(id: string, business_id:string){
  return prisma.customer.findFirst({where: {id, business_id}});
}

export async function createCustomer(business_id: string, input: CreateCustomerInput){
  return prisma.customer.create ({
    data: {
      business_id,
      ...input
    },
  });
}
