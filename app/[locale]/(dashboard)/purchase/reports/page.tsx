"use client";

import Link from "next/link";
import {
  Truck,
  BookOpen,
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

const purchaseReports = [
  {
    titleKey: "reports_vendor_recap_title",
    descKey: "reports_vendor_recap_desc",
    href: "/purchase/reports/vendor-recap",
    icon: Truck,
  },
  {
    titleKey: "reports_payable_title",
    descKey: "reports_payable_desc",
    href: "/purchase/reports/payable",
    icon: BookOpen,
  },
];

export default function PurchaseReportsPage() {
  const t = useTranslations("Purchase");
  const tNav = useTranslations("Navigation");

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/purchase" className="text-sm text-muted-foreground hover:text-foreground">
          {tNav("purchase")}
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <h1 className="text-lg font-bold">{t("reports_title")}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {purchaseReports.map((report) => (
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
