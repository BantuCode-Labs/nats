import { prisma } from "./seed/utils";
import { seedAccounting } from "./seed/accounting";
import { seedCompany } from "./seed/company";
import { seedUsers } from "./seed/users";

async function main() {
  console.log("🚀 Mulai seeding minimal (IDR / id-ID)...");
  const start = Date.now();

  try {
    await seedCompany();
    await seedAccounting(); // Akun & tarif pajak
    await seedUsers(); // Peran & pengguna

    const end = Date.now();
    console.log(`✅ Seeding minimal selesai dalam ${(end - start) / 1000}s`);
  } catch (e) {
    console.error("❌ Seeding minimal gagal:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
