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
  console.log("🚀 Mulai seeding data (IDR / id-ID)...");
  const start = Date.now();

  try {
    await seedCompany();
    await seedAccounting(); // Akun, saldo, default, tarif pajak
    await seedUsers(); // Peran & pengguna
    await seedSampleJournalEntries(); // Contoh jurnal (butuh user admin)
    await seedInventory(); // Gudang, satuan, kategori, produk
    await seedContacts(); // Pelanggan & pemasok
    await seedHR(); // Departemen, karyawan, komponen gaji
    await seedProjects(); // Proyek
    await seedTransactions(); // Penjualan, pembelian, kas

    console.log("🛠️ Mulai seeding massal...");
    await seedBulkUsers(50);
    await seedBulkContacts(50);
    await seedBulkInventory(SEED_COUNT);
    await seedBulkHR(50);
    await seedBulkProjects(50);
    await seedBulkTransactions(SEED_COUNT);

    // Setelah seluruh modul menghasilkan jurnal, hitung ulang runningBalance
    // pada setiap baris dan agregat AccountBalance per akun.
    await reconcileJournalEntries();

    const end = Date.now();
    console.log(`✅ Seeding selesai dalam ${(end - start) / 1000}s`);
  } catch (e) {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
