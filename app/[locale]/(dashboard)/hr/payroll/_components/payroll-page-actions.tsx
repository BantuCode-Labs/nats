"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Protect } from "@/components/ui/protect";
import { CreatePeriodDialog } from "./create-period-dialog";
import { useTranslations } from "next-intl";

export function PayrollPageActions() {
    const t = useTranslations("HR");

    return (
        <div className="flex items-center gap-2">
            <Protect permission="payroll.create">
                <CreatePeriodDialog />
            </Protect>
            <Protect permission="payroll.configure">
                <Link href="/hr/payroll/components">
                    <Button variant="outline">{t("manage_components")}</Button>
                </Link>
            </Protect>
        </div>
    );
}
