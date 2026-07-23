import { prisma } from "./utils";
import {
  faker,
  getRandomItem,
  generateUniqueSKU,
  randomIndonesianAddress,
} from "./bulk_utils";
import { ProjectStatus } from "../generated/prisma/client";

export async function seedProjects() {
  console.log("Menyiapkan proyek...");

  const projects = [
    {
      name: "Redesain Situs Web Perusahaan",
      code: "PROJ-WEB-2026",
      description: "Perombakan total situs web korporat dan portal pelanggan",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      status: ProjectStatus.ACTIVE,
    },
    {
      name: "Perluasan Kantor Pusat",
      code: "PROJ-OFF-2026",
      description: "Perluasan kantor pusat ke lantai 2 gedung utama",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-12-31"),
      status: ProjectStatus.ACTIVE,
    },
    {
      name: "Kampanye Pemasaran Q1",
      code: "PROJ-MKT-Q1",
      description: "Kampanye pemasaran digital kuartal 1 tahun 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-31"),
      status: ProjectStatus.COMPLETED,
    },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { code: project.code },
      update: {
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
      },
      create: {
        name: project.name,
        code: project.code,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
      },
    });
  }
}

export async function seedBulkProjects(count: number) {
  console.log(`Menyiapkan ${count} proyek massal...`);

  const customers = await prisma.contact.findMany({
    where: { type: "CUSTOMER" },
  });

  if (customers.length === 0) {
    console.warn("Tidak ada pelanggan untuk proyek massal. Dilewati.");
    return;
  }

  const projectTypes = [
    "Implementasi ERP",
    "Migrasi Sistem",
    "Digitalisasi Proses",
    "Pengadaan Peralatan",
    "Renovasi Kantor",
    "Pelatihan SDM",
    "Kampanye Branding",
    "Integrasi Marketplace",
    "Audit Internal",
    "Pengembangan Aplikasi",
  ];

  const projects = [];
  for (let i = 0; i < count; i++) {
    const type = getRandomItem(projectTypes);
    const customer = getRandomItem(customers);
    const name = `${type} - ${customer.name.split(" ").slice(0, 2).join(" ")}`;
    const code = generateUniqueSKU("PROJ", i + 100);
    const startDate = faker.date.past({ years: 2 });
    const endDate = faker.date.future({ years: 1, refDate: startDate });

    projects.push({
      name,
      code,
      description: `Proyek ${type.toLowerCase()} di ${randomIndonesianAddress()}.`,
      startDate,
      endDate,
      status: getRandomItem([
        ProjectStatus.ACTIVE,
        ProjectStatus.COMPLETED,
        ProjectStatus.ON_HOLD,
        ProjectStatus.CANCELLED,
      ]),
    });
  }

  await prisma.project.createMany({
    data: projects,
    skipDuplicates: true,
  });
}
