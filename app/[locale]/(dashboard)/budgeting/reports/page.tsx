"use client";

import Link from "next/link";
import {
  BarChart3,
  Building2,
  FolderKanban,
  AlertTriangle,
  CalendarRange,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

const budgetingReports = [
  {
    titleKey: "reports_variance_title",
    descKey: "reports_variance_desc",
    href: "/budgeting/reports/variance",
    icon: BarChart3,
  },
  {
    titleKey: "reports_by_department_title",
    descKey: "reports_by_department_desc",
    href: "/budgeting/reports/by-department",
    icon: Building2,
  },
  {
    titleKey: "reports_by_project_title",
    descKey: "reports_by_project_desc",
    href: "/budgeting/reports/by-project",
    icon: FolderKanban,
  },
  {
    titleKey: "reports_overspending_title",
    descKey: "reports_overspending_desc",
    href: "/budgeting/reports/overspending",
    icon: AlertTriangle,
  },
  {
    titleKey: "reports_monthly_title",
    descKey: "reports_monthly_desc",
    href: "/budgeting/reports/monthly",
    icon: CalendarRange,
  },
  {
    titleKey: "reports_status_title",
    descKey: "reports_status_desc",
    href: "/budgeting/reports/status",
    icon: ListChecks,
  },
];

export default function BudgetingReportsPage() {
  const t = useTranslations("Budgeting");

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="mb-2">
        <h1 className="text-lg font-bold">{t("reports_title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("reports_subtitle")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgetingReports.map((report) => (
          <Link href={report.href} key={report.href}>
            <Card className="from-primary/5 bg-linear-to-t hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-medium">
                  {t(report.titleKey)}
                </CardTitle>
                <report.icon className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mt-2">
                  {t(report.descKey)}
                </CardDescription>
                <div className="flex items-center text-sm text-primary mt-4 font-medium">
                  {t("reports_view_report")}{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
