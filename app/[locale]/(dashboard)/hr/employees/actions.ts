'use server';

import { revalidatePath } from 'next/cache';
import { EmployeeService } from '@/modules/hr/services/employee.service';
import { CreateEmployeeDTO, UpdateEmployeeDTO, ActionResponse } from '@/modules/hr/types';
import { SuperJSON } from "@/lib/superjson";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { prisma } from "@/lib/prisma";

export async function getEmployees(
    page = 1,
    pageSize = 10,
    search = "",
    departmentId?: string,
    isActive?: boolean,
): Promise<ActionResponse> {
    const session = await getSession();
    if (!session || !hasPermission(session.permissions, "hr.employees.view")) {
        return { success: false, error: "Forbidden: Insufficient permissions" };
    }
    try {
        const result = await EmployeeService.getEmployees({ page, pageSize, search, departmentId, isActive });
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getEmployee(id: string): Promise<ActionResponse> {
    const session = await getSession();
    if (!session || !hasPermission(session.permissions, "hr.employees.view")) {
        return { success: false, error: "Forbidden: Insufficient permissions" };
    }
    try {
        const employee = await EmployeeService.getEmployee(id);
        if (!employee) {
            return { success: false, error: "Employee not found" };
        }
        return { success: true, data: SuperJSON.serialize(employee) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export const createEmployee = authorizedAction(
    "hr.employees.create",
    async (data: CreateEmployeeDTO): Promise<ActionResponse> => {
        try {
            const employee = await EmployeeService.createEmployee(data);
            revalidatePath('/hr/employees');
            return { success: true, data: SuperJSON.serialize(employee) };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
);

export const updateEmployee = authorizedAction(
    "hr.employees.edit",
    async (id: string, data: UpdateEmployeeDTO): Promise<ActionResponse> => {
        try {
            const session = await getSession();
            const employee = await EmployeeService.updateEmployee(
                id,
                data,
                session?.userId || 'system',
            );
            revalidatePath('/hr/employees');
            revalidatePath(`/hr/employees/${id}`);
            return { success: true, data: SuperJSON.serialize(employee) };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
);

export async function getEmployeeOptions(search = ""): Promise<ActionResponse> {
    const session = await getSession();
    if (!session || !hasPermission(session.permissions, "hr.employees.view")) {
        return { success: false, error: "Forbidden: Insufficient permissions" };
    }
    try {
        const employees = await prisma.contact.findMany({
            where: {
                type: "EMPLOYEE",
                isActive: true,
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search, mode: "insensitive" } },
                            { email: { contains: search, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
            select: {
                id: true,
                name: true,
                employeeDetail: { select: { id: true, jobTitle: true, department: true } },
            },
            orderBy: { name: "asc" },
            take: 50,
        });
        return { success: true, data: SuperJSON.serialize(employees) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getHrDashboardStats(): Promise<ActionResponse> {
    const session = await getSession();
    if (!session || !hasPermission(session.permissions, "hr.employees.view")) {
        return { success: false, error: "Forbidden: Insufficient permissions" };
    }
    try {
        const stats = await EmployeeService.getDashboardStats();
        return { success: true, data: SuperJSON.serialize(stats) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
