"use client";

import Link from "next/link";
import {
  ClipboardList,
  PackageMinus,
  Factory,
  DollarSign,
  FileSpreadsheet,
  Layers,
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

const productionReports = [
  {
    titleKey: "reports_order_status_title",
    descKey: "reports_order_status_desc",
    href: "/production/reports/order-status",
    icon: ClipboardList,
  },
  {
    titleKey: "reports_material_consumption_title",
    descKey: "reports_material_consumption_desc",
    href: "/production/reports/material-consumption",
    icon: PackageMinus,
  },
  {
    titleKey: "reports_output_yield_title",
    descKey: "reports_output_yield_desc",
    href: "/production/reports/output-yield",
    icon: Factory,
  },
  {
    titleKey: "reports_cost_analysis_title",
    descKey: "reports_cost_analysis_desc",
    href: "/production/reports/cost-analysis",
    icon: DollarSign,
  },
  {
    titleKey: "reports_bom_cost_title",
    descKey: "reports_bom_cost_desc",
    href: "/production/reports/bom-cost",
    icon: FileSpreadsheet,
  },
  {
    titleKey: "reports_wip_title",
    descKey: "reports_wip_desc",
    href: "/production/reports/wip",
    icon: Layers,
  },
];

export default function ProductionReportsPage() {
  const t = useTranslations("Production");

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="mb-2">
        <h1 className="text-lg font-bold">{t("reports_title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("reports_subtitle")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {productionReports.map((report) => (
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
