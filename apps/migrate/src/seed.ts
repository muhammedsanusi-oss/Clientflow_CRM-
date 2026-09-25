/**
 * Dev seed — idempotent. Run with: pnpm db:seed
 * The project owns the contents of this file; the skeleton ships no demo data.
 */

import { prisma } from "@project/db";

const BUSINESS_ID = "demo-business";
const USER_ID = "demo-user";
const ROLE_ID = "demo-role";
const EMPLOYEE_ID = "demo-employee";

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.employee_role.upsert({
      where: { id: ROLE_ID },
      update: {
        name: "Staff",
        description: "Standard employee access",
      },
      create: {
        id: ROLE_ID,
        name: "Staff",
        description: "Standard employee access",
      },
    });

    await tx.business.upsert({
      where: { id: BUSINESS_ID },
      update: {
        name: "Happy Paws Pet Care",
        business_type: "OTHER",
        phone_number: "555-0100",
        email: "hello@happypaws.test",
      },
      create: {
        id: BUSINESS_ID,
        name: "Happy Paws Pet Care",
        business_type: "OTHER",
        phone_number: "555-0100",
        email: "hello@happypaws.test",
      },
    });

    await tx.location.upsert({
      where: { id: "demo-location-downtown" },
      update: {
        business_id: BUSINESS_ID,
        name: "Downtown",
        phone_number: "555-0101",
        email: "downtown@happypaws.test",
        address: "100 Main Street",
        is_active: true,
      },
      create: {
        id: "demo-location-downtown",
        business_id: BUSINESS_ID,
        name: "Downtown",
        phone_number: "555-0101",
        email: "downtown@happypaws.test",
        address: "100 Main Street",
        is_active: true,
      },
    });

    await tx.location.upsert({
      where: { id: "demo-location-north" },
      update: {
        business_id: BUSINESS_ID,
        name: "North Side",
        phone_number: "555-0102",
        email: "north@happypaws.test",
        address: "200 North Avenue",
        is_active: true,
      },
      create: {
        id: "demo-location-north",
        business_id: BUSINESS_ID,
        name: "North Side",
        phone_number: "555-0102",
        email: "north@happypaws.test",
        address: "200 North Avenue",
        is_active: true,
      },
    });

    await tx.user.upsert({
      where: { id: USER_ID },
      update: { username: "demo-user" },
      create: {
        id: USER_ID,
        username: "demo-user",
      },
    });

    await tx.employee.upsert({
      where: { id: EMPLOYEE_ID },
      update: {
        business_id: BUSINESS_ID,
        user_id: USER_ID,
        role_id: ROLE_ID,
        first_name: "Demo",
        last_name: "Employee",
        email: "employee@happypaws.test",
        phone_number: "555-0110",
        is_active: true,
        hire_date: "2026-01-01",
      },
      create: {
        id: EMPLOYEE_ID,
        business_id: BUSINESS_ID,
        user_id: USER_ID,
        role_id: ROLE_ID,
        first_name: "Demo",
        last_name: "Employee",
        email: "employee@happypaws.test",
        phone_number: "555-0110",
        is_active: true,
        hire_date: "2026-01-01",
      },
    });

    const services = ["Service 1", "Service 2", "Service 3"];

    for (const [index, name] of services.entries()) {
      await tx.service.upsert({
        where: { id: `demo-service-${index + 1}` },
        update: {
          business_id: BUSINESS_ID,
          name,
          category: "Example",
          description: "Placeholder service for appointment scheduling",
          duration_minutes: 30,
          base_price: 0,
          is_Active: true,
        },
        create: {
          id: `demo-service-${index + 1}`,
          business_id: BUSINESS_ID,
          name,
          category: "Example",
          description: "Placeholder service for appointment scheduling",
          duration_minutes: 30,
          base_price: 0,
          is_Active: true,
        },
      });
    }

    const customers = [
      {
        id: "demo-customer-maria",
        business_id: BUSINESS_ID,
        first_name: "Maria",
        last_name: "Lopez",
        phone_number: "555-0201",
        email: "maria@example.test",
        address: "15 Oak Street",
        preferred_contact_method: "TEXT" as const,
      },
      {
        id: "demo-customer-james",
        business_id: BUSINESS_ID,
        first_name: "James",
        last_name: "Wilson",
        phone_number: "555-0202",
        email: "james@example.test",
        address: "42 Pine Road",
        preferred_contact_method: "EMAIL" as const,
      },
      {
        id: "demo-customer-aisha",
        business_id: BUSINESS_ID,
        first_name: "Aisha",
        last_name: "Brown",
        phone_number: "555-0203",
        email: "aisha@example.test",
        address: "88 Maple Avenue",
        preferred_contact_method: "PHONE" as const,
      },
    ];

    for (const customer of customers) {
      const { id, ...data } = customer;

      await tx.customer.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }
  });

  console.log(
    "seeded demo business, locations, employee, services, and customers",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
