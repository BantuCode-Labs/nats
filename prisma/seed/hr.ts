import { prisma } from "./utils";
import { ContactType, SalaryComponentType, PayrollPeriodStatus } from "../generated/prisma/client";
import { faker } from "@faker-js/faker";
import { getRandomItem } from "./bulk_utils";

export async function seedHR() {
    console.log("Seeding HR Module...");

    // 0. Statutory defaults (PPh 21, BPJS)
    try {
        const { StatutoryService } = await import("../../modules/payroll/services/statutory.service");
        await StatutoryService.seedDefaults();
        console.log("Statutory payroll rules seeded.");
    } catch (e) {
        console.warn("Could not seed statutory rules:", (e as Error).message);
    }

    // 1. Departments
    const departments = [
        { name: "Engineering", code: "ENG" },
        { name: "Sales", code: "SALES" },
        { name: "Human Resources", code: "HR" },
        { name: "Finance", code: "FIN" },
    ];

    for (const dept of departments) {
        await prisma.department.upsert({
            where: { code: dept.code },
            update: { name: dept.name },
            create: { name: dept.name, code: dept.code },
        });
    }

    // 2. Salary Components
    console.log("Creating Salary Components...");

    let basicComponent = await prisma.salaryComponent.findFirst({ where: { name: "Basic Salary" } });
    if (!basicComponent) {
        basicComponent = await prisma.salaryComponent.create({
            data: {
                name: "Basic Salary",
                type: SalaryComponentType.EARNING,
                isTaxable: true,
            },
        });
    }

    let transportComponent = await prisma.salaryComponent.findFirst({ where: { name: "Transport Allowance" } });
    if (!transportComponent) {
        transportComponent = await prisma.salaryComponent.create({
            data: {
                name: "Transport Allowance",
                type: SalaryComponentType.EARNING,
                isTaxable: false,
            },
        });
    }

    let taxComponent = await prisma.salaryComponent.findFirst({ where: { name: "Income Tax" } });
    if (!taxComponent) {
        taxComponent = await prisma.salaryComponent.create({
            data: {
                name: "Income Tax",
                type: SalaryComponentType.DEDUCTION,
                isTaxable: false,
            },
        });
    }

    // 3. Employees (Contacts + EmployeeDetail)
    const employeesData = [
        {
            name: "John Doe",
            email: "john.doe@example.com",
            role: "Software Engineer",
            deptCode: "ENG",
            baseSalary: 5000,
            joinDate: new Date("2024-01-15")
        },
        {
            name: "Jane Smith",
            email: "jane.smith@example.com",
            role: "Sales Manager",
            deptCode: "SALES",
            baseSalary: 6000,
            joinDate: new Date("2023-05-10")
        },
        {
            name: "Robert Johnson",
            email: "robert.johnson@example.com",
            role: "HR Specialist",
            deptCode: "HR",
            baseSalary: 4000,
            joinDate: new Date("2025-02-01")
        },
    ];

    for (let i = 0; i < employeesData.length; i++) {
        const empData = employeesData[i];
        let employee = await prisma.contact.findFirst({
            where: { email: empData.email, type: ContactType.EMPLOYEE },
        });

        if (!employee) {
            employee = await prisma.contact.create({
                data: {
                    name: empData.name,
                    email: empData.email,
                    type: ContactType.EMPLOYEE,
                    isActive: true,
                },
            });
        }

        // Upsert EmployeeDetail
        const department = await prisma.department.findUnique({ where: { code: empData.deptCode } });

        // Check if detail exists
        const existingDetail = await prisma.employeeDetail.findUnique({ where: { contactId: employee.id } });
        if (!existingDetail) {
            await prisma.employeeDetail.create({
                data: {
                    contactId: employee.id,
                    employeeNumber: `EMP-${empData.deptCode}-${String(i + 1).padStart(3, "0")}`,
                    jobTitle: empData.role,
                    department: department?.name || "General",
                    departmentId: department?.id || null,
                    joinDate: empData.joinDate,
                    taxFilingStatus: "TK0",
                    hasNpwp: true,
                }
            });
        }

        // Assign Salary Structure
        const existingStructure = await prisma.salaryStructure.findFirst({
            where: { contactId: employee.id, isActive: true },
        });

        if (!existingStructure) {
            await prisma.salaryStructure.create({
                data: {
                    name: "Standard Structure 2026",
                    contactId: employee.id,
                    baseSalary: empData.baseSalary,
                    isActive: true,
                    items: {
                        create: [
                            { componentId: basicComponent!.id, amount: empData.baseSalary, formula: "" },
                            { componentId: transportComponent!.id, amount: 200, formula: "" },
                            // Dummy tax calculation/fixed
                            { componentId: taxComponent!.id, amount: empData.baseSalary * 0.1, formula: "" }
                        ]
                    },
                },
            });
        }
    }

    // 4. Payroll Period
    console.log("Creating Payroll Period...");
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodName = `Payroll ${startOfMonth.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;

    const existingPeriod = await prisma.payrollPeriod.findFirst({
        where: { name: periodName },
    });

    if (!existingPeriod) {
        await prisma.payrollPeriod.create({
            data: {
                name: periodName,
                startDate: startOfMonth,
                endDate: endOfMonth,
                status: PayrollPeriodStatus.DRAFT,
            },
        });
    }
}

export async function seedBulkHR(count: number) {
    console.log(`Seeding ${count} Bulk Employees...`);

    const departments = await prisma.department.findMany();
    const salaryComponents = await prisma.salaryComponent.findMany();

    if (departments.length === 0 || salaryComponents.length === 0) {
        console.warn("Missing Departments or Salary Components. Skipping bulk HR.");
        return;
    }

    const basicComp = salaryComponents.find(c => c.name === "Basic Salary");
    const transportComp = salaryComponents.find(c => c.name === "Transport Allowance");
    const taxComp = salaryComponents.find(c => c.name === "Income Tax");

    for (let i = 0; i < count; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName, provider: 'company.com' }).toLowerCase();
        const dept = getRandomItem(departments);

        const contact = await prisma.contact.create({
            data: {
                name: `${firstName} ${lastName}`,
                email,
                type: ContactType.EMPLOYEE,
                isActive: true,
                phone: faker.phone.number(),
                address: faker.location.streetAddress(),
            }
        });

        await prisma.employeeDetail.create({
            data: {
                contactId: contact.id,
                jobTitle: faker.person.jobTitle(),
                department: dept.name,
                joinDate: faker.date.past({ years: 5 }),
            }
        });

        const baseSalary = faker.number.int({ min: 3000, max: 15000 });

        await prisma.salaryStructure.create({
            data: {
                name: `Structure - ${contact.name}`,
                contactId: contact.id,
                baseSalary,
                isActive: true,
                items: {
                    create: [
                        { componentId: basicComp!.id, amount: baseSalary, formula: "" },
                        { componentId: transportComp!.id, amount: 500, formula: "" },
                        { componentId: taxComp!.id, amount: baseSalary * 0.1, formula: "" }
                    ]
                }
            }
        });

        if (i % 100 === 0 && i > 0) {
            console.log(`  Processed HR ${i} / ${count}`);
        }
    }
}
