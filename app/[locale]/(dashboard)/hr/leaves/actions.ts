'use server';

import { revalidatePath } from 'next/cache';
import { LeaveService } from '@/modules/hr/services/leave.service';
import { CreateLeaveRequestDTO, ReviewLeaveRequestDTO, ActionResponse } from '@/modules/hr/types';
import { SuperJSON } from '@/lib/superjson';
import { authorizedAction } from '@/lib/permissions/protected-action';
import { getSession } from '@/lib/auth/auth';
import { hasPermission } from '@/lib/permissions/utils';
import { LeaveRequestStatus } from '@/prisma/generated/prisma/client';

export async function getLeaveRequests(params: {
    page?: number;
    pageSize?: number;
    status?: LeaveRequestStatus;
    employeeDetailId?: string;
}): Promise<ActionResponse> {
    const session = await getSession();
    if (!session || !hasPermission(session.permissions, 'hr.leave.view')) {
        return { success: false, error: 'Forbidden: Insufficient permissions' };
    }
    try {
        const result = await LeaveService.listRequests(params);
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export const createLeaveRequest = authorizedAction(
    'hr.leave.manage',
    async (data: CreateLeaveRequestDTO): Promise<ActionResponse> => {
        try {
            const request = await LeaveService.createRequest(data);
            revalidatePath('/hr/leaves');
            return { success: true, data: SuperJSON.serialize(request) };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
);

export const reviewLeaveRequest = authorizedAction(
    'hr.leave.manage',
    async (data: ReviewLeaveRequestDTO): Promise<ActionResponse> => {
        try {
            const request = await LeaveService.reviewRequest(data);
            revalidatePath('/hr/leaves');
            return { success: true, data: SuperJSON.serialize(request) };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
);

export async function getLeaveBalances(employeeDetailId: string, year?: number): Promise<ActionResponse> {
    const session = await getSession();
    if (!session || !hasPermission(session.permissions, 'hr.leave.view')) {
        return { success: false, error: 'Forbidden: Insufficient permissions' };
    }
    try {
        const balances = await LeaveService.getBalances(employeeDetailId, year);
        return { success: true, data: SuperJSON.serialize(balances) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
