"use client";

import Link from "next/link";
import {
  FileText,
  Factory,
  PackageMinus,
  PackageCheck,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const productionModules = [
  {
    title: "Bill of Materials",
    description:
      "Define product recipes. Create Bills of Materials (BOM) that specify raw materials, quantities, and routing steps needed to manufacture a product.",
    icon: FileText,
    href: "/production/boms",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    step: 1,
  },
  {
    title: "Production Orders",
    description:
      "Plan and execute manufacturing. Create production orders based on BOMs, schedule production runs, and track progress from start to completion.",
    icon: Factory,
    href: "/production/orders",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    step: 2,
  },
  {
    title: "Material Issues",
    description:
      "Consume raw materials. Issue materials from inventory to production orders, tracking what goes into each manufacturing run.",
    icon: PackageMinus,
    href: "/production/issues",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    step: 3,
  },
  {
    title: "Finished Goods Receipts",
    description:
      "Receive completed products. Record finished goods coming off the production line back into inventory, completing the manufacturing cycle.",
    icon: PackageCheck,
    href: "/production/receipts",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    step: 4,
  },
];

export default function ProductionLandingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production</h1>
          <p className="text-muted-foreground">
            Manage manufacturing from raw materials to finished goods
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Process Flow</CardTitle>
          <CardDescription>
            The manufacturing workflow follows these steps. Define your BOM, create
            production orders, issue materials, and receive finished goods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {productionModules.map((mod, i) => (
              <div key={mod.href} className="flex items-center gap-2">
                <Link
                  href={mod.href}
                  className="rounded-full bg-muted px-3 py-1.5 font-medium hover:bg-muted/80 transition-colors"
                >
                  {mod.step}. {mod.title}
                </Link>
                {i < productionModules.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {productionModules.map((mod) => (
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
