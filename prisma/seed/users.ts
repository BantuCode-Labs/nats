import { prisma } from "./utils";
import { hash } from "bcryptjs";
import { faker } from "@faker-js/faker";
import { getRandomItem } from "./bulk_utils";

export async function seedUsers() {
    console.log("Seeding Users and Roles...");

    // Seed Roles
    const superAdminRole = await prisma.role.upsert({
        where: { name: "superadmin" },
        update: {},
        create: {
            name: "superadmin",
            description: "Super Administrator with full access",
            permissions: ["*"],
        },
    });

    const accountantRole = await prisma.role.upsert({
        where: { name: "Accountant" },
        update: {},
        create: {
            name: "Accountant",
            description: "Accountant with financial access",
            permissions: [
                "accounting.view",
                "accounting.create",
                "reports.view",
                "budgeting.view",
                "budgeting.create"
            ],
        },
    });

    const cashierRole = await prisma.role.upsert({
        where: { name: "Cashier" },
        update: {},
        create: {
            name: "Cashier",
            description: "POS Cashier",
            permissions: [
                "pos.access",
                "sales.create",
                "sales.view",
                "sales.payments",
                "products.view",
                "customers.create",
                "customers.view",
                "inventory.view"
            ],
        },
    });

    const customerRole = await prisma.role.upsert({
        where: { name: "Customer" },
        update: {},
        create: {
            name: "Customer",
            description: "Default Customer Role",
            permissions: ["profile.view", "orders.view", "orders.create"],
        },
    });

    const merchantRole = await prisma.role.upsert({
        where: { name: "Merchant" },
        update: {},
        create: {
            name: "Merchant",
            description: "Merchant/Vendor Role",
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
            permissions: [
                ...hrPermissions,
                "budgeting.view",
                "budgeting.approve",
            ],
        },
        create: {
            name: "Manager",
            description: "Department Manager",
            permissions: [
                ...hrPermissions,
                "budgeting.view",
                "budgeting.approve",
            ],
        },
    });

    const hrRole = await prisma.role.upsert({
        where: { name: "HR" },
        update: { permissions: hrPermissions },
        create: {
            name: "HR",
            description: "Human Resources Officer",
            permissions: hrPermissions,
        },
    });

    // Seed Users
    const passwordHash = await hash("password123", 10);

    await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: { password: passwordHash, roleId: superAdminRole.id },
        create: {
            email: "admin@example.com",
            name: "Admin User",
            password: passwordHash,
            roleId: superAdminRole.id
        },
    });

    await prisma.user.upsert({
        where: { email: "merchant@example.com" },
        update: { password: passwordHash, roleId: merchantRole.id },
        create: {
            email: "merchant@example.com",
            name: "Sample Merchant",
            password: passwordHash,
            roleId: merchantRole.id
        },
    });

    await prisma.user.upsert({
        where: { email: "customer@example.com" },
        update: { password: passwordHash, roleId: customerRole.id },
        create: {
            email: "customer@example.com",
            name: "Sample Customer",
            password: passwordHash,
            roleId: customerRole.id
        },
    });

    await prisma.user.upsert({
        where: { email: "cashier@example.com" },
        update: { password: passwordHash, roleId: cashierRole.id },
        create: {
            email: "cashier@example.com",
            name: "Jane Cashier",
            password: passwordHash,
            roleId: cashierRole.id
        },
    });

    await prisma.user.upsert({
        where: { email: "accountant@example.com" },
        update: { password: passwordHash, roleId: accountantRole.id },
        create: {
            email: "accountant@example.com",
            name: "John Accountant",
            password: passwordHash,
            roleId: accountantRole.id
        },
    });

    await prisma.user.upsert({
        where: { email: "manager@example.com" },
        update: { password: passwordHash, roleId: managerRole.id },
        create: {
            email: "manager@example.com",
            name: "Mike Manager",
            password: passwordHash,
            roleId: managerRole.id
        },
    });
}

export async function seedBulkUsers(count: number) {
    console.log(`Seeding ${count} Bulk Users...`);

    const roles = await prisma.role.findMany({
        where: { name: { not: "superadmin" } }
    });

    if (roles.length === 0) {
        console.warn("No roles found for bulk users. Skipping.");
        return;
    }

    const passwordHash = await hash("password123", 10);
    const users = [];

    for (let i = 0; i < count; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();
        
        users.push({
            email: `bulk_${i}_${email}`, // Ensure uniqueness
            name: `${firstName} ${lastName}`,
            password: passwordHash,
            roleId: getRandomItem(roles).id,
        });
    }

    // Using createMany for performance
    await prisma.user.createMany({
        data: users,
        skipDuplicates: true,
    });
}
