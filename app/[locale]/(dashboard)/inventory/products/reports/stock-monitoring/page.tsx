"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { StockMonitoringView } from "./_components/stock-monitoring-view";

export default function StockMonitoringPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StockMonitoringView />
    </Suspense>
  );
}
