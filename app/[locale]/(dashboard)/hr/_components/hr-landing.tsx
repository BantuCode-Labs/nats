"use client";

import Link from "next/link";
import {
  Users,
  Wallet,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const hrModules = [
  {
    title: "Employees",
    description:
      "Manage your workforce. Maintain employee records including personal details, contact information, departments, and employment history.",
    icon: Users,
    href: "/hr/employees",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    step: 1,
  },
  {
    title: "Payroll",
    description:
      "Process compensation. Set up salary structures, run payroll periods, calculate earnings and deductions, and generate pay slips.",
    icon: Wallet,
    href: "/hr/payroll",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    step: 2,
  },
];

export default function HrLandingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Human Resources</h1>
          <p className="text-muted-foreground">
            Manage employees and payroll processing
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HR Process Flow</CardTitle>
          <CardDescription>
            Start by adding employees to the system, then configure salary
            structures and run payroll periods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {hrModules.map((mod, i) => (
              <div key={mod.href} className="flex items-center gap-2">
                <Link
                  href={mod.href}
                  className="rounded-full bg-muted px-3 py-1.5 font-medium hover:bg-muted/80 transition-colors"
                >
                  {mod.step}. {mod.title}
                </Link>
                {i < hrModules.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {hrModules.map((mod) => (
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
