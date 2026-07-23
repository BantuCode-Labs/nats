import { prisma } from "./utils";
import { hash } from "bcryptjs";
import { faker, getRandomItem } from "./bulk_utils";

export async function seedUsers() {
  console.log("Menyiapkan pengguna dan peran...");

  const superAdminRole = await prisma.role.upsert({
    where: { name: "superadmin" },
    update: {},
    create: {
      name: "superadmin",
      description: "Super Administrator dengan akses penuh",
      permissions: ["*"],
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: { name: "Accountant" },
    update: {
      description: "Akuntan dengan akses keuangan",
    },
    create: {
      name: "Accountant",
      description: "Akuntan dengan akses keuangan",
      permissions: [
        "accounting.view",
        "accounting.create",
        "reports.view",
        "budgeting.view",
        "budgeting.create",
      ],
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: "Cashier" },
    update: {
      description: "Kasir POS",
    },
    create: {
      name: "Cashier",
      description: "Kasir POS",
      permissions: [
        "pos.access",
        "sales.create",
        "sales.view",
        "sales.payments",
        "products.view",
        "customers.create",
        "customers.view",
        "inventory.view",
      ],
    },
  });

  await prisma.role.upsert({
    where: { name: "Customer" },
    update: {
      description: "Peran pelanggan default",
    },
    create: {
      name: "Customer",
      description: "Peran pelanggan default",
      permissions: ["profile.view", "orders.view", "orders.create"],
    },
  });

  const merchantRole = await prisma.role.upsert({
    where: { name: "Merchant" },
    update: {
      description: "Peran pedagang/pemasok",
    },
    create: {
      name: "Merchant",
      description: "Peran pedagang/pemasok",
      permissions: ["products.manage", "orders.manage", "sales.view"],
    },
  });

  const hrPermissions = [
    "hr.employees.view",
    "hr.employees.create",
    "hr.employees.edit",
    "hr.attendance.view",
    "hr.attendance.manage",
    "hr.leave.view",
    "hr.leave.manage",
    "payroll.view",
    "payroll.create",
    "payroll.approve",
    "payroll.configure",
    "payroll.pay",
  ];

  const managerRole = await prisma.role.upsert({
    where: { name: "Manager" },
    update: {
      description: "Manajer departemen",
      permissions: [...hrPermissions, "budgeting.view", "budgeting.approve"],
    },
    create: {
      name: "Manager",
      description: "Manajer departemen",
      permissions: [...hrPermissions, "budgeting.view", "budgeting.approve"],
    },
  });

  await prisma.role.upsert({
    where: { name: "HR" },
    update: {
      description: "Petugas sumber daya manusia",
      permissions: hrPermissions,
    },
    create: {
      name: "HR",
      description: "Petugas sumber daya manusia",
      permissions: hrPermissions,
    },
  });

  const passwordHash = await hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { password: passwordHash, roleId: superAdminRole.id, name: "Admin Utama" },
    create: {
      email: "admin@example.com",
      name: "Admin Utama",
      password: passwordHash,
      roleId: superAdminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "merchant@example.com" },
    update: {
      password: passwordHash,
      roleId: merchantRole.id,
      name: "Pedagang Contoh",
    },
    create: {
      email: "merchant@example.com",
      name: "Pedagang Contoh",
      password: passwordHash,
      roleId: merchantRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {
      password: passwordHash,
      roleId: (await prisma.role.findUnique({ where: { name: "Customer" } }))!
        .id,
      name: "Pelanggan Contoh",
    },
    create: {
      email: "customer@example.com",
      name: "Pelanggan Contoh",
      password: passwordHash,
      roleId: (await prisma.role.findUnique({ where: { name: "Customer" } }))!
        .id,
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@example.com" },
    update: {
      password: passwordHash,
      roleId: cashierRole.id,
      name: "Siti Kasir",
    },
    create: {
      email: "cashier@example.com",
      name: "Siti Kasir",
      password: passwordHash,
      roleId: cashierRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "accountant@example.com" },
    update: {
      password: passwordHash,
      roleId: accountantRole.id,
      name: "Budi Akuntan",
    },
    create: {
      email: "accountant@example.com",
      name: "Budi Akuntan",
      password: passwordHash,
      roleId: accountantRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {
      password: passwordHash,
      roleId: managerRole.id,
      name: "Andi Manajer",
    },
    create: {
      email: "manager@example.com",
      name: "Andi Manajer",
      password: passwordHash,
      roleId: managerRole.id,
    },
  });
}

export async function seedBulkUsers(count: number) {
  console.log(`Menyiapkan ${count} pengguna massal...`);

  const roles = await prisma.role.findMany({
    where: { name: { not: "superadmin" } },
  });

  if (roles.length === 0) {
    console.warn("Tidak ada peran untuk pengguna massal. Dilewati.");
    return;
  }

  const passwordHash = await hash("password123", 10);
  const users = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet
      .email({ firstName, lastName, provider: "contoh.co.id" })
      .toLowerCase();

    users.push({
      email: `bulk_${i}_${email}`,
      name: `${firstName} ${lastName}`,
      password: passwordHash,
      roleId: getRandomItem(roles).id,
    });
  }

  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });
}
