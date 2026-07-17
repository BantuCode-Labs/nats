"use client";

import Link from "next/link";
import {
  Users,
  BookOpen,
  Clock,
  Package,
  TrendingUp,
  Receipt,
  Undo2,
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

const salesReports = [
  {
    titleKey: "reports_customer_recap_title",
    descKey: "reports_customer_recap_desc",
    href: "/sales/reports/customer-recap",
    icon: Users,
  },
  {
    titleKey: "reports_receivable_title",
    descKey: "reports_receivable_desc",
    href: "/sales/reports/receivable",
    icon: BookOpen,
  },
  {
    titleKey: "reports_ar_aging_title",
    descKey: "reports_ar_aging_desc",
    href: "/sales/reports/ar-aging",
    icon: Clock,
  },
  {
    titleKey: "reports_sales_by_product_title",
    descKey: "reports_sales_by_product_desc",
    href: "/sales/reports/sales-by-product",
    icon: Package,
  },
  {
    titleKey: "reports_profitability_title",
    descKey: "reports_profitability_desc",
    href: "/sales/reports/profitability",
    icon: TrendingUp,
  },
  {
    titleKey: "reports_tax_summary_title",
    descKey: "reports_tax_summary_desc",
    href: "/sales/reports/tax-summary",
    icon: Receipt,
  },
  {
    titleKey: "reports_return_analysis_title",
    descKey: "reports_return_analysis_desc",
    href: "/sales/reports/return-analysis",
    icon: Undo2,
  },
];

export default function SalesReportsPage() {
  const t = useTranslations("Sales");
  const tNav = useTranslations("Navigation");

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/sales" className="text-sm text-muted-foreground hover:text-foreground">
          {tNav("sales")}
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <h1 className="text-lg font-bold">{t("reports_title")}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {salesReports.map((report) => (
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
                  {t("reports_view_report")} <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
