"use client";

import Link from "next/link";
import {
  ClipboardList,
  FileText,
  Truck,
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

const salesModules = [
  {
    title: "Sales Orders",
    description:
      "Start here. Create and manage customer orders. Define what products or services your customer wants to purchase, set pricing, quantities, and delivery expectations.",
    icon: ClipboardList,
    href: "/sales/orders",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    step: 1,
  },
  {
    title: "Sales Invoices",
    description:
      "Bill your customers. Generate invoices from sales orders or create standalone invoices. Track due dates, payment terms, and outstanding balances.",
    icon: FileText,
    href: "/sales/invoices",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    step: 2,
  },
  {
    title: "Shipments",
    description:
      "Deliver products. Record and track shipments linked to sales orders. Manage delivery status, shipping details, and inventory dispatch.",
    icon: Truck,
    href: "/sales/shipments",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    step: 3,
  },
  {
    title: "Payments",
    description:
      "Collect revenue. Record payments received from customers against invoices. Track partial payments, overpayments, and outstanding amounts.",
    icon: CreditCard,
    href: "/sales/payments",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    step: 4,
  },
  {
    title: "Returns",
    description:
      "Handle returns and refunds. Process product returns from customers, manage return authorizations, and adjust inventory and invoices accordingly.",
    icon: RotateCcw,
    href: "/sales/returns",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    step: 5,
  },
];

export default function SalesLandingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            Manage your complete sales cycle from order to payment
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/sales/dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Dashboard
          </Link>
        </Button>
      </div>

      {/* Business Flow Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Process Flow</CardTitle>
          <CardDescription>
            The typical sales workflow follows these steps. Each stage links to
            its management page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {salesModules.map((mod, i) => (
              <div key={mod.href} className="flex items-center gap-2">
                <Link
                  href={mod.href}
                  className="rounded-full bg-muted px-3 py-1.5 font-medium hover:bg-muted/80 transition-colors"
                >
                  {mod.step}. {mod.title}
                </Link>
                {i < salesModules.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {salesModules.map((mod) => (
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
