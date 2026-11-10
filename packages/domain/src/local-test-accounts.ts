/*
 * Code guide: packages/domain/src/local-test-accounts.ts
 * Local login fixture setup, called only for the documented development test emails. Upserts fixed identities
 * and Sample business without resetting existing details/passwords. It does not reconstruct every restored
 * sample website.
 */
/*
 * Import connection: @project/db -> packages/db/src/index.ts.
 * prisma: Shared database client from packages/db; queries reach PostgreSQL or the configured embedded test
 * database. Defined in packages/db/src/client.ts.
 */
import { prisma } from "@project/db";
/*
 * Import connection: @project/auth/password -> packages/auth/src/password.ts.
 * hashPassword: Creates a random salt and derives a scrypt key. Returns a stored hash format, never the
 * plaintext password.
 */
import { hashPassword } from "@project/auth/password";
/*
 * Import connection: @project/auth/test-accounts -> packages/auth/src/test-accounts.ts.
 * LOCAL_TEST_ACCOUNTS: Fixed development-only developer/teammate/owner identifiers and display information.
 * LOCAL_TEST_PASSWORD: Intentionally public synthetic password for the local test identities; not a
 * production credential.
 */
import { LOCAL_TEST_ACCOUNTS, LOCAL_TEST_PASSWORD } from "@project/auth/test-accounts";
import { WEBSITE_TEMPLATE_KEYS } from "./website-templates";

// This fixed fixture is never an arbitrary account registration endpoint.
/*
 * Development-only, idempotent creation of the fixed developer/owner fixtures and Sample business. Existing
 * passwords and existing business details are not reset.
 */
export async function ensureLocalTestAccounts(email: string) {
  if (process.env.NODE_ENV !== "development" || !Object.values(LOCAL_TEST_ACCOUNTS).some(account => account.email === email)) return;
  const passwordHash = await hashPassword(LOCAL_TEST_PASSWORD);
  await prisma.$transaction(async tx => {
    for (const [role, account] of Object.entries(LOCAL_TEST_ACCOUNTS)) {
      await tx.user.upsert({ where: { id: account.id }, update: {}, create: {
        ...account, passwordHash, isDeveloper: role !== "owner",
      } });
    }
    const owner = LOCAL_TEST_ACCOUNTS.owner;
    const business = await tx.business.upsert({ where: { id: "local-test-business" }, update: {}, create: {
      id: "local-test-business", name: "Sample business", description: "A sample business portal for testing Clientflow.",
      business_type: "OTHER", email: "hello@sample-business.test", phone_number: "2125550142",
      employees: { create: { user_id: owner.id, first_name: "Test", last_name: "Owner", email: owner.email,
        phone_number: "2125550142", role: "OWNER", hire_date: new Date() } },
    } });
    if (business.websiteTemplate === null) {
      await tx.business.update({
        where: { id: business.id },
        data: { websiteTemplate: WEBSITE_TEMPLATE_KEYS[Math.floor(Math.random() * WEBSITE_TEMPLATE_KEYS.length)] },
      });
    }
    const [locationCount, serviceCount, businessHoursCount, staffCount] = await Promise.all([
      tx.location.count({ where: { business_id: business.id } }),
      tx.service.count({ where: { business_id: business.id } }),
      tx.businessHoursInterval.count({ where: { businessId: business.id } }),
      tx.bookingStaff.count({ where: { businessId: business.id } }),
    ]);
    if (locationCount === 0 && serviceCount === 0 && businessHoursCount === 0 && staffCount === 0) {
      await tx.location.create({
        data: {
          business_id: business.id,
          name: "Sample location",
          address: "100 Example Street",
        },
      });
      await tx.service.create({
        data: {
          business_id: business.id,
          name: "Sample appointment",
          category: "General",
          description: "A sample service for testing online bookings.",
          duration_minutes: 30,
          base_price: 0,
          is_Active: true,
        },
      });
      const weekdays = [1, 2, 3, 4, 5];
      await tx.businessHoursInterval.createMany({
        data: weekdays.map(dayOfWeek => ({
          businessId: business.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
        })),
      });
      const staff = await tx.bookingStaff.create({
        data: { businessId: business.id, name: "Sample team member" },
      });
      await tx.bookingStaffHours.createMany({
        data: weekdays.map(dayOfWeek => ({
          bookingStaffId: staff.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
        })),
      });
    }
    if (email === owner.email) {
      await tx.employee.updateMany({
        where: { user_id: owner.id, business_id: { not: business.id }, is_active: true },
        data: { is_active: false },
      });
    }
    const developers = await tx.user.findMany({ where: { isDeveloper: true }, select: { id: true } });
    await tx.developerBusinessAccess.createMany({ data: developers.map(developer => ({ developerId: developer.id, businessId: business.id })), skipDuplicates: true });
    const businesses = await tx.business.findMany({ where: { developerAccess: { some: {} } }, select: { id: true } });
    for (const developer of [LOCAL_TEST_ACCOUNTS.developer, LOCAL_TEST_ACCOUNTS.teammate]) {
      await tx.developerBusinessAccess.createMany({ data: businesses.map(item => ({ developerId: developer.id, businessId: item.id })), skipDuplicates: true });
    }
  });
}
