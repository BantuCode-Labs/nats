"use client";

import Link from "next/link";
import {
  Package,
  Warehouse,
  ArrowLeftRight,
  Tag,
  Ruler,
  DollarSign,
  BarChart3,
  ArrowRight,
  FileBarChart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const inventoryModules = [
  {
    title: "Categories",
    description:
      "Organize products into groups. Create hierarchical categories to classify products for easier browsing and reporting.",
    icon: Tag,
    href: "/inventory/categories",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    step: 1,
  },
  {
    title: "Units of Measure",
    description:
      "Define measurement units. Set up units (pieces, kg, liters, etc.) and conversion factors for accurate inventory tracking.",
    icon: Ruler,
    href: "/inventory/uom",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    step: 2,
  },
  {
    title: "Warehouses",
    description:
      "Organize storage locations. Set up warehouses and bin locations to track where inventory is stored and manage stock across multiple sites.",
    icon: Warehouse,
    href: "/inventory/warehouses",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    step: 3,
  },
  {
    title: "Products",
    description:
      "Manage your product catalog. Define products with SKUs, descriptions, images, and classifications for tracking across the system.",
    icon: Package,
    href: "/inventory/products",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    step: 4,
  },
  {
    title: "Pricing",
    description:
      "Set product prices. Configure selling prices, manage bulk discounts, and maintain price lists for different customer segments.",
    icon: DollarSign,
    href: "/inventory/pricing",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    step: 5,
  },
  {
    title: "Movements",
    description:
      "Track inventory flow. Record stock in, out, transfers, and adjustments. Maintain full traceability of every inventory change.",
    icon: ArrowLeftRight,
    href: "/inventory/movements",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    step: 6,
  },
  {
    title: "Reports",
    description:
      "Business reports for stock valuation, low stock alerts, warehouse distribution, movement summary, product margins, and slow-moving stock.",
    icon: FileBarChart,
    href: "/inventory/products/reports",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    step: 7,
  },
];

export default function InventoryLandingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage products, stock levels, warehouses, and pricing
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/inventory">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Management Flow</CardTitle>
          <CardDescription>
            Set up and manage your inventory through these core areas. Start
            with products and warehouses, then track movements and pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {inventoryModules.map((mod, i) => (
              <div key={mod.href} className="flex items-center gap-2">
                <Link
                  href={mod.href}
                  className="rounded-full bg-muted px-3 py-1.5 font-medium hover:bg-muted/80 transition-colors"
                >
                  {mod.step}. {mod.title}
                </Link>
                {i < inventoryModules.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {inventoryModules.map((mod) => (
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
