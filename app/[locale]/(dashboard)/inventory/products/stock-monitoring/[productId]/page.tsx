"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { StockDetailClient } from "./stock-detail-client";

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StockDetailClient params={params} />
    </Suspense>
  );
}
