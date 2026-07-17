"use client";

import Link from "next/link";
import {
  Wallet,
  LineChart,
  ArrowRight,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  Users,
  CalendarDays,
  Building2,
  FolderKanban,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

const cashBankReports = [
  {
    titleKey: "reports_cash_balance_title",
    descKey: "reports_cash_balance_desc",
    href: "/cash-bank/reports/cash-balance",
    icon: Wallet,
  },
  {
    titleKey: "reports_period_balance_title",
    descKey: "reports_period_balance_desc",
    href: "/cash-bank/reports/period-balance",
    icon: LineChart,
  },
  {
    titleKey: "reports_cash_flow_title",
    descKey: "reports_cash_flow_desc",
    href: "/cash-bank/reports/cash-flow",
    icon: Activity,
  },
  {
    titleKey: "reports_daily_movement_title",
    descKey: "reports_daily_movement_desc",
    href: "/cash-bank/reports/daily-movement",
    icon: CalendarDays,
  },
  {
    titleKey: "reports_expense_by_account_title",
    descKey: "reports_expense_by_account_desc",
    href: "/cash-bank/reports/expense-by-account",
    icon: TrendingDown,
  },
  {
    titleKey: "reports_income_by_account_title",
    descKey: "reports_income_by_account_desc",
    href: "/cash-bank/reports/income-by-account",
    icon: TrendingUp,
  },
  {
    titleKey: "reports_transfers_title",
    descKey: "reports_transfers_desc",
    href: "/cash-bank/reports/transfers",
    icon: ArrowLeftRight,
  },
  {
    titleKey: "reports_cash_by_contact_title",
    descKey: "reports_cash_by_contact_desc",
    href: "/cash-bank/reports/cash-by-contact",
    icon: Users,
  },
  {
    titleKey: "reports_by_department_title",
    descKey: "reports_by_department_desc",
    href: "/cash-bank/reports/by-department",
    icon: Building2,
  },
  {
    titleKey: "reports_by_project_title",
    descKey: "reports_by_project_desc",
    href: "/cash-bank/reports/by-project",
    icon: FolderKanban,
  },
];

export default function CashBankReportsPage() {
  const t = useTranslations("CashBank");
  const tNav = useTranslations("Navigation");

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/cash-bank"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {tNav("cash_bank")}
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <h1 className="text-lg font-bold">{t("reports_title")}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cashBankReports.map((report) => (
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
