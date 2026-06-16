import { prisma } from "./seed/utils";
import {
  seedAccounting,
  seedSampleJournalEntries,
  reconcileJournalEntries,
} from "./seed/accounting";
import { seedCompany } from "./seed/company";
import { seedUsers, seedBulkUsers } from "./seed/users";
import { seedInventory, seedBulkInventory } from "./seed/inventory";
import { seedContacts, seedBulkContacts } from "./seed/contacts";
import { seedHR, seedBulkHR } from "./seed/hr";
import { seedProjects, seedBulkProjects } from "./seed/projects";
import { seedTransactions, seedBulkTransactions } from "./seed/transactions";
import { SEED_COUNT } from "./seed/bulk_utils";

async function main() {
  console.log("🚀 Start seeding...");
  const start = Date.now();

  try {
    await seedCompany();
    await seedAccounting(); // Accounts, AccountBalance, Default Accounts, Tax Rates
    await seedUsers(); // Roles, Users
    await seedSampleJournalEntries(); // Sample JEs (needs the admin user)
    await seedInventory(); // Warehouses, Units, Categories, Products
    await seedContacts(); // Customers, Vendors
    await seedHR(); // Departments, Employees, Salary Components
    await seedProjects(); // Projects
    await seedTransactions(); // Sales, Purchases, JEs

    console.log("🛠️ Starting Bulk Seeding...");
    await seedBulkUsers(50);
    await seedBulkContacts(50);
    await seedBulkInventory(SEED_COUNT);
    await seedBulkHR(50);
    await seedBulkProjects(50);
    await seedBulkTransactions(SEED_COUNT);

    // After every other module has produced its journal entries, walk them
    // in chronological order and fill in `runningBalance` on every line and
    // the aggregate `AccountBalance` row for every account.
    await reconcileJournalEntries();

    const end = Date.now();
    console.log(`✅ Seeding completed in ${(end - start) / 1000}s`);
  } catch (e) {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
