import { prisma } from "@project/db";
import { hashPassword } from "@project/auth/password";
import { LOCAL_TEST_ACCOUNTS, LOCAL_TEST_PASSWORD } from "@project/auth/test-accounts";

// This fixed fixture is never an arbitrary account registration endpoint.
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
    const developers = await tx.user.findMany({ where: { isDeveloper: true }, select: { id: true } });
    await tx.developerBusinessAccess.createMany({ data: developers.map(developer => ({ developerId: developer.id, businessId: business.id })), skipDuplicates: true });
    const businesses = await tx.business.findMany({ where: { developerAccess: { some: {} } }, select: { id: true } });
    for (const developer of [LOCAL_TEST_ACCOUNTS.developer, LOCAL_TEST_ACCOUNTS.teammate]) {
      await tx.developerBusinessAccess.createMany({ data: businesses.map(item => ({ developerId: developer.id, businessId: item.id })), skipDuplicates: true });
    }
  });
}
