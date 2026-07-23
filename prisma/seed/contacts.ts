import { prisma } from "./utils";
import { ContactType } from "../generated/prisma/client";
import {
  faker,
  randomCompanyName,
  randomIndonesianAddress,
  randomIndonesianPhone,
} from "./bulk_utils";

export async function seedContacts() {
  console.log("Menyiapkan kontak (pelanggan & pemasok)...");

  const customers = [
    {
      name: "PT Maju Bersama Sejahtera",
      email: "pembelian@majubersama.co.id",
      phone: "021-5551001",
      address: "Jl. Gatot Subroto Kav. 12, Jakarta Selatan",
      type: ContactType.CUSTOMER,
    },
    {
      name: "CV Nusantara Retailindo",
      email: "order@nusantaretail.co.id",
      phone: "022-4208899",
      address: "Jl. Asia Afrika No. 88, Bandung",
      type: ContactType.CUSTOMER,
    },
    {
      name: "Toko Berkah Mandiri",
      email: "tokoberkah@gmail.com",
      phone: "081234567890",
      address: "Jl. Malioboro No. 15, Yogyakarta",
      type: ContactType.CUSTOMER,
    },
  ];

  for (const customer of customers) {
    const existing = await prisma.contact.findFirst({
      where: { name: customer.name, type: ContactType.CUSTOMER },
    });

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: customer,
      });
    } else {
      await prisma.contact.create({
        data: customer,
      });
    }
  }

  // Migrasi nama kontak lama berbahasa Inggris jika masih ada
  const legacyCustomers: Record<string, (typeof customers)[number]> = {
    "Acme Corp": customers[0],
    "Global Industries": customers[1],
    "Local Shop": customers[2],
  };
  for (const [oldName, data] of Object.entries(legacyCustomers)) {
    const legacy = await prisma.contact.findFirst({
      where: { name: oldName, type: ContactType.CUSTOMER },
    });
    if (legacy) {
      await prisma.contact.update({
        where: { id: legacy.id },
        data,
      });
    }
  }

  const vendors = [
    {
      name: "PT Sumber Alat Tulis",
      email: "sales@sumberatk.co.id",
      phone: "021-5552001",
      address: "Jl. Hayam Wuruk No. 45, Jakarta Barat",
      type: ContactType.VENDOR,
    },
    {
      name: "CV Teknologi Prima Distributor",
      email: "order@teknologiprima.co.id",
      phone: "031-5678901",
      address: "Jl. Raya Darmo No. 120, Surabaya",
      type: ContactType.VENDOR,
    },
    {
      name: "PT Jasa Perawatan Gedung",
      email: "layanan@perawatangedung.co.id",
      phone: "021-5552003",
      address: "Jl. Rasuna Said Blok X-5, Jakarta Selatan",
      type: ContactType.VENDOR,
    },
  ];

  for (const vendor of vendors) {
    const existing = await prisma.contact.findFirst({
      where: { name: vendor.name, type: ContactType.VENDOR },
    });

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: vendor,
      });
    } else {
      await prisma.contact.create({
        data: vendor,
      });
    }
  }

  const legacyVendors: Record<string, (typeof vendors)[number]> = {
    "Office Supplies Co": vendors[0],
    "Tech Wholesalers": vendors[1],
    "Maintenance Services Inc": vendors[2],
  };
  for (const [oldName, data] of Object.entries(legacyVendors)) {
    const legacy = await prisma.contact.findFirst({
      where: { name: oldName, type: ContactType.VENDOR },
    });
    if (legacy) {
      await prisma.contact.update({
        where: { id: legacy.id },
        data,
      });
    }
  }
}

export async function seedBulkContacts(count: number) {
  console.log(`Menyiapkan ${count} kontak massal (pelanggan & pemasok)...`);

  const contacts = [];
  for (let i = 0; i < count; i++) {
    const isCustomer = faker.datatype.boolean();
    const type = isCustomer ? ContactType.CUSTOMER : ContactType.VENDOR;
    const name = randomCompanyName(!isCustomer);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 18);

    contacts.push({
      name,
      email: `${slug || "kontak"}${i}@contoh.co.id`,
      phone: randomIndonesianPhone(),
      address: randomIndonesianAddress(),
      type,
      isActive: true,
    });
  }

  await prisma.contact.createMany({
    data: contacts,
    skipDuplicates: true,
  });
}
