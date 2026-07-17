'use server';

import { revalidatePath } from 'next/cache';
import { AttendanceService } from '@/modules/hr/services/attendance.service';
import { CreateAttendanceDTO, ActionResponse } from '@/modules/hr/types';
import { SuperJSON } from '@/lib/superjson';
import { authorizedAction } from '@/lib/permissions/protected-action';
import { getSession } from '@/lib/auth/auth';
import { hasPermission } from '@/lib/permissions/utils';

export async function getAttendanceRecords(params: {
    page?: number;
    pageSize?: number;
    employeeDetailId?: string;
    from?: string;
    to?: string;
}): Promise<ActionResponse> {
    const session = await getSession();
    if (!session || !hasPermission(session.permissions, 'hr.attendance.view')) {
        return { success: false, error: 'Forbidden: Insufficient permissions' };
    }
    try {
        const result = await AttendanceService.list({
            page: params.page,
            pageSize: params.pageSize,
            employeeDetailId: params.employeeDetailId,
            from: params.from ? new Date(params.from) : undefined,
            to: params.to ? new Date(params.to) : undefined,
        });
        return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export const upsertAttendance = authorizedAction(
    'hr.attendance.manage',
    async (data: CreateAttendanceDTO): Promise<ActionResponse> => {
        try {
            const record = await AttendanceService.upsert(data);
            revalidatePath('/hr/attendance');
            return { success: true, data: SuperJSON.serialize(record) };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
);

export const bulkMarkPresent = authorizedAction(
    'hr.attendance.manage',
    async (employeeDetailIds: string[], dateIso: string): Promise<ActionResponse> => {
        try {
            const records = await AttendanceService.bulkMarkPresent(
                employeeDetailIds,
                new Date(dateIso)
            );
            revalidatePath('/hr/attendance');
            return { success: true, data: SuperJSON.serialize(records) };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
);
