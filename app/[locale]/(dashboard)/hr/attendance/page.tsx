"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    PageListLayout,
    PageListHeader,
    PageListTitle,
    PageListActions,
    PageListContent,
    PageListFilter,
} from "@/components/layout/page/list-layout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getAttendanceRecords, upsertAttendance } from "./actions";
import { getEmployeeOptions } from "../employees/actions";
import { SuperJSON } from "@/lib/superjson";
import { SuperJSONResult } from "superjson";
import { AttendanceStatus } from "@/prisma/generated/prisma/browser";
import { useToast } from "@/hooks/use-toast";
import { Protect } from "@/components/ui/protect";

type EmployeeOption = {
    id: string;
    name: string;
    employeeDetail?: { id: string; jobTitle?: string | null } | null;
};

type AttendanceRecord = {
    id: string;
    date: Date | string;
    status: AttendanceStatus;
    overtimeHours: number | string;
    notes?: string | null;
    employeeDetail: {
        id: string;
        contact: { id: string; name: string };
    };
};

type AttendanceListResponse = {
    items: AttendanceRecord[];
    total: number;
    page: number;
    pageSize: number;
};

export default function AttendancePage() {
    const t = useTranslations("HR");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const today = format(new Date(), "yyyy-MM-dd");
    const [from, setFrom] = useState(today);
    const [to, setTo] = useState(today);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);

    const [form, setForm] = useState({
        employeeDetailId: "",
        date: today,
        status: AttendanceStatus.PRESENT as AttendanceStatus,
        overtimeHours: "0",
    });

    useEffect(() => {
        async function loadEmployees() {
            const result = await getEmployeeOptions();
            if (result.success && result.data) {
                setEmployees(
                    SuperJSON.deserialize<EmployeeOption[]>(
                        result.data as SuperJSONResult
                    )
                );
            }
        }
        loadEmployees();
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ["attendance", from, to],
        queryFn: async () => {
            const result = await getAttendanceRecords({
                page: 1,
                pageSize: 50,
                from,
                to,
            });
            if (!result.success) throw new Error(result.error);
            return SuperJSON.deserialize<AttendanceListResponse>(
                result.data as SuperJSONResult
            );
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.employeeDetailId || !form.date) return;
        setSaving(true);
        try {
            const result = await upsertAttendance({
                employeeDetailId: form.employeeDetailId,
                date: new Date(form.date),
                status: form.status,
                overtimeHours: Number(form.overtimeHours) || 0,
            });
            if (result.success) {
                toast({ title: tCommon("success"), description: t("attendance_saved") });
                setOpen(false);
                queryClient.invalidateQueries({ queryKey: ["attendance"] });
            } else {
                toast({
                    title: tCommon("error"),
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: tCommon("error"),
                description: "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const statusVariant = (status: string) => {
        switch (status) {
            case "PRESENT":
                return "default";
            case "ABSENT":
                return "destructive";
            case "LATE":
            case "HALF_DAY":
                return "secondary";
            default:
                return "outline";
        }
    };

    return (
        <PageListLayout>
            <PageListHeader>
                <PageListTitle title={t("attendance_title")} />
                <PageListActions>
                    <Protect permission="hr.attendance.manage">
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("record_attendance")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>{t("record_attendance")}</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>{t("employee")}</Label>
                                        <Select
                                            value={form.employeeDetailId}
                                            onValueChange={(v) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    employeeDetailId: v,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("employee")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees
                                                    .filter((e) => e.employeeDetail?.id)
                                                    .map((e) => (
                                                        <SelectItem
                                                            key={e.id}
                                                            value={e.employeeDetail!.id}
                                                        >
                                                            {e.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("date")}</Label>
                                        <Input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    date: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{tCommon("status")}</Label>
                                        <Select
                                            value={form.status}
                                            onValueChange={(v) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    status: v as AttendanceStatus,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.values(AttendanceStatus).map((s) => (
                                                    <SelectItem key={s} value={s}>
                                                        {s.replace(/_/g, " ")}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("overtime_hours")}</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={form.overtimeHours}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    overtimeHours: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={saving}>
                                        {saving && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {tCommon("save")}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    </Protect>
                </PageListActions>
            </PageListHeader>
            <PageListFilter>
                <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">{t("from")}</Label>
                    <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-[160px]"
                    />
                    <Label className="text-sm text-muted-foreground">{t("to")}</Label>
                    <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-[160px]"
                    />
                </div>
            </PageListFilter>
            <PageListContent>
                {isLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("date")}</TableHead>
                                <TableHead>{t("employee")}</TableHead>
                                <TableHead>{tCommon("status")}</TableHead>
                                <TableHead className="text-right">
                                    {t("overtime_hours")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(data?.items || []).map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        {format(new Date(row.date), "PP")}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {row.employeeDetail.contact.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant(row.status)}>
                                            {row.status.replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(row.overtimeHours)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!data?.items?.length && (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        {t("no_attendance_found")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </PageListContent>
        </PageListLayout>
    );
}
