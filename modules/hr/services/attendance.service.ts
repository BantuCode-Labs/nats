import { prisma } from '@/lib/prisma';
import { CreateAttendanceDTO } from '../types';
import { AttendanceStatus, Prisma } from '@/prisma/generated/prisma/client';

function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export class AttendanceService {
    static async list({
        page = 1,
        pageSize = 20,
        employeeDetailId,
        from,
        to,
    }: {
        page?: number;
        pageSize?: number;
        employeeDetailId?: string;
        from?: Date;
        to?: Date;
    }) {
        const skip = (page - 1) * pageSize;
        const where: Prisma.AttendanceRecordWhereInput = {
            ...(employeeDetailId ? { employeeDetailId } : {}),
            ...(from || to
                ? {
                    date: {
                        ...(from ? { gte: startOfDay(from) } : {}),
                        ...(to ? { lte: startOfDay(to) } : {}),
                    },
                }
                : {}),
        };

        const [items, total] = await Promise.all([
            prisma.attendanceRecord.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                include: {
                    employeeDetail: {
                        include: {
                            contact: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            prisma.attendanceRecord.count({ where }),
        ]);

        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }

    static async upsert(data: CreateAttendanceDTO) {
        const date = startOfDay(data.date);
        return prisma.attendanceRecord.upsert({
            where: {
                employeeDetailId_date: {
                    employeeDetailId: data.employeeDetailId,
                    date,
                },
            },
            create: {
                employeeDetailId: data.employeeDetailId,
                date,
                status: data.status,
                checkIn: data.checkIn || null,
                checkOut: data.checkOut || null,
                overtimeHours: data.overtimeHours ?? 0,
                notes: data.notes || null,
            },
            update: {
                status: data.status,
                checkIn: data.checkIn || null,
                checkOut: data.checkOut || null,
                overtimeHours: data.overtimeHours ?? 0,
                notes: data.notes || null,
            },
            include: {
                employeeDetail: {
                    include: { contact: { select: { id: true, name: true } } },
                },
            },
        });
    }

    static async bulkMarkPresent(employeeDetailIds: string[], date: Date) {
        const day = startOfDay(date);
        const results = [];
        for (const employeeDetailId of employeeDetailIds) {
            results.push(
                await this.upsert({
                    employeeDetailId,
                    date: day,
                    status: AttendanceStatus.PRESENT,
                })
            );
        }
        return results;
    }

    static async getOvertimeHours(employeeDetailId: string, from: Date, to: Date) {
        const records = await prisma.attendanceRecord.findMany({
            where: {
                employeeDetailId,
                date: { gte: startOfDay(from), lte: startOfDay(to) },
            },
        });
        return records.reduce((sum, r) => sum + Number(r.overtimeHours), 0);
    }
}
