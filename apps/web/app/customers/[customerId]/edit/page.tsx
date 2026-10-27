import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@project/auth";
import { getCustomerWithNotesForUser } from "@project/domain";
import { CustomerEditForm } from "./customer-edit-form";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { customerId } = await params;
  const customer = await getCustomerWithNotesForUser(userId, customerId);
  if (!customer) notFound();
  return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <Link href={`/customers/${customer.id}`} className="text-sm text-blue-700 underline">Back to customer</Link>
    <h1 className="text-2xl font-bold">Edit customer</h1>
    <p className="text-sm text-neutral-600">Business: {customer.business.name}</p>
    <CustomerEditForm customerId={customer.id} initialValues={{
      firstName: customer.first_name, lastName: customer.last_name,
      phoneNumber: customer.phone_number, email: customer.email,
      address: customer.address, preferredContactMethod: customer.preferred_contact_method,
    }} />
  </main>;
}
