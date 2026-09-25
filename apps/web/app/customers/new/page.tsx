import Link from "next/link";

import { CustomerForm } from "./customer-form";

export default function NewCustomerPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <Link
          href="/customers"
          className="text-sm text-blue-600 underline underline-offset-2"
        >
          Back to customers
        </Link>

        <h1 className="text-2xl font-bold">Add customer</h1>

        <p className="text-sm text-neutral-600">
          Add a customer shared with employees in your business.
        </p>
      </header>

      <CustomerForm />
    </main>
  );
}
