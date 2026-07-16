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

const purchaseReports = [
  {
    title: "Purchase Recap per Vendor",
    description:
      "Rekap pembelian per vendor dalam periode tertentu. Menampilkan total invoice, retur, pembayaran, pembelian bersih, dan hutang tertunda.",
    href: "/purchase/reports/vendor-recap",
    icon: Truck,
  },
  {
    title: "Payable Report per Vendor",
    description:
      "Rekap hutang dagang per vendor: posisi saldo awal, perubahan (invoice, retur, pembayaran), dan saldo akhir pada periode tertentu.",
    href: "/purchase/reports/payable",
    icon: BookOpen,
  },
];

export default function PurchaseReportsPage() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/purchase" className="text-sm text-muted-foreground hover:text-foreground">
          Purchase
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <h1 className="text-lg font-bold">Reports</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {purchaseReports.map((report) => (
          <Link href={report.href} key={report.href}>
            <Card className="from-primary/5 bg-linear-to-t hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-medium">
                  {report.title}
                </CardTitle>
                <report.icon className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base mt-2">
                  {report.description}
                </CardDescription>
                <div className="flex items-center text-sm text-primary mt-4 font-medium">
                  View Report <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
