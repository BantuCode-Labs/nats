"use client";

import { EmployeeForm } from "../_components/employee-form";
import { Protect } from "@/components/ui/protect";
import { useTranslations } from "next-intl";

export default function NewEmployeePage() {
    const t = useTranslations("HR");

    return (
        <Protect
            permission="hr.employees.create"
            fallback={
                <div className="p-6 text-sm text-muted-foreground">
                    {t("forbidden") || "You do not have permission to create employees."}
                </div>
            }
        >
            <EmployeeForm />
        </Protect>
    );
}
