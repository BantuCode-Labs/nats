"use client";

import Link from "next/link";
import {
  ClipboardList,
  FileText,
  PackageCheck,
  CreditCard,
  RotateCcw,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const purchaseModules = [
  {
    title: "Purchase Orders",
    description:
      "Start here. Create purchase orders to request goods or services from suppliers. Define quantities, pricing, and expected delivery dates.",
    icon: ClipboardList,
    href: "/purchase/orders",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    step: 1,
  },
  {
    title: "Purchase Invoices",
    description:
      "Record supplier bills. Match invoices against purchase orders, track payment terms, and manage outstanding payables.",
    icon: FileText,
    href: "/purchase/invoices",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    step: 2,
  },
  {
    title: "Receives",
    description:
      "Receive goods. Record incoming shipments from suppliers, verify quantities against purchase orders, and update inventory.",
    icon: PackageCheck,
    href: "/purchase/receives",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    step: 3,
  },
  {
    title: "Payments",
    description:
      "Pay suppliers. Record payments made against purchase invoices, track partial payments, and manage cash outflow.",
    icon: CreditCard,
    href: "/purchase/payments",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    step: 4,
  },
  {
    title: "Returns",
    description:
      "Handle returns. Process returns to suppliers for defective or unwanted goods, and adjust inventory and invoices accordingly.",
    icon: RotateCcw,
    href: "/purchase/returns",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    step: 5,
  },
];

export default function PurchaseLandingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase</h1>
          <p className="text-muted-foreground">
            Manage your complete procurement cycle from order to payment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/purchase/reports">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/purchase/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Process Flow</CardTitle>
          <CardDescription>
            The typical procurement workflow follows these steps. Each stage
            links to its management page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {purchaseModules.map((mod, i) => (
              <div key={mod.href} className="flex items-center gap-2">
                <Link
                  href={mod.href}
                  className="rounded-full bg-muted px-3 py-1.5 font-medium hover:bg-muted/80 transition-colors"
                >
                  {mod.step}. {mod.title}
                </Link>
                {i < purchaseModules.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {purchaseModules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg p-2 ${mod.color}`}>
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {mod.step}
                  </span>
                </div>
                <CardTitle className="mt-2 group-hover:underline">
                  {mod.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {mod.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
