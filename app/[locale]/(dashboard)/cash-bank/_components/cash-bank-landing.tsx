"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  CreditCard,
  ArrowRightLeft,
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

const cashBankModules = [
  {
    title: "Transactions",
    description:
      "Record all cash and bank transactions. Manage receipts, payments, and journal entries across your cash and bank accounts.",
    icon: CreditCard,
    href: "/cash-bank/transaction",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    step: undefined,
  },
  {
    title: "Transfers",
    description:
      "Move money between accounts. Transfer funds between cash registers, bank accounts, and petty cash with full audit trail.",
    icon: ArrowRightLeft,
    href: "/cash-bank/transfer",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    step: undefined,
  },
  {
    title: "Reports",
    description:
      "Analyze cash and bank positions. Cash balance per period and account balance trends across monthly periods.",
    icon: BarChart3,
    href: "/cash-bank/reports",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    step: undefined,
  },
];

export default function CashBankLandingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash & Bank</h1>
          <p className="text-muted-foreground">
            Manage cash flow, bank accounts, and fund transfers
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/cash-bank">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash & Bank Process Flow</CardTitle>
          <CardDescription>
            Manage your cash and bank operations through these core activities.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {cashBankModules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg p-2 ${mod.color}`}>
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {mod.step ?? ""}
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
