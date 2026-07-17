"use client";

import Link from "next/link";
import {
  DollarSign,
  AlertTriangle,
  Warehouse,
  ArrowLeftRight,
  Percent,
  PackageX,
  Activity,
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

const productReports = [
  {
    titleKey: "stock_monitoring",
    descKey: "reports_stock_monitoring_desc",
    href: "/inventory/products/reports/stock-monitoring",
    icon: Activity,
  },
  {
    titleKey: "reports_stock_valuation_title",
    descKey: "reports_stock_valuation_desc",
    href: "/inventory/products/reports/stock-valuation",
    icon: DollarSign,
  },
  {
    titleKey: "reports_low_stock_title",
    descKey: "reports_low_stock_desc",
    href: "/inventory/products/reports/low-stock",
    icon: AlertTriangle,
  },
  {
    titleKey: "reports_stock_by_warehouse_title",
    descKey: "reports_stock_by_warehouse_desc",
    href: "/inventory/products/reports/stock-by-warehouse",
    icon: Warehouse,
  },
  {
    titleKey: "reports_movement_summary_title",
    descKey: "reports_movement_summary_desc",
    href: "/inventory/products/reports/movement-summary",
    icon: ArrowLeftRight,
  },
  {
    titleKey: "reports_product_margin_title",
    descKey: "reports_product_margin_desc",
    href: "/inventory/products/reports/product-margin",
    icon: Percent,
  },
  {
    titleKey: "reports_slow_moving_title",
    descKey: "reports_slow_moving_desc",
    href: "/inventory/products/reports/slow-moving",
    icon: PackageX,
  },
];

export default function ProductReportsPage() {
  const t = useTranslations("Inventory");

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="mb-2">
        <h1 className="text-lg font-bold">{t("reports_title")}</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {productReports.map((report) => (
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
