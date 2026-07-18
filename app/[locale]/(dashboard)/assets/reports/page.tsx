"use client";

import Link from "next/link";
import {
  ClipboardList,
  TrendingDown,
  Layers,
  Trash2,
  Scale,
  MapPin,
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

const assetReports = [
  {
    titleKey: "reports_register_title",
    descKey: "reports_register_desc",
    href: "/assets/reports/register",
    icon: ClipboardList,
  },
  {
    titleKey: "reports_depreciation_title",
    descKey: "reports_depreciation_desc",
    href: "/assets/reports/depreciation",
    icon: TrendingDown,
  },
  {
    titleKey: "reports_by_category_title",
    descKey: "reports_by_category_desc",
    href: "/assets/reports/by-category",
    icon: Layers,
  },
  {
    titleKey: "reports_disposal_title",
    descKey: "reports_disposal_desc",
    href: "/assets/reports/disposal",
    icon: Trash2,
  },
  {
    titleKey: "reports_valuation_title",
    descKey: "reports_valuation_desc",
    href: "/assets/reports/valuation",
    icon: Scale,
  },
  {
    titleKey: "reports_by_location_title",
    descKey: "reports_by_location_desc",
    href: "/assets/reports/by-location",
    icon: MapPin,
  },
];

export default function AssetsReportsPage() {
  const t = useTranslations("Assets");

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="mb-2">
        <h1 className="text-lg font-bold">{t("reports_title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("reports_subtitle")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assetReports.map((report) => (
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
