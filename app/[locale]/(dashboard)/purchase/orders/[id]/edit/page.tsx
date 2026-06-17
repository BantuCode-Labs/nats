export const dynamic = "force-dynamic";

import { getPurchaseOrder } from "../../actions";
import { PurchaseOrderForm } from "../../_components/purchase-order-form";
import { notFound } from "next/navigation";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { getTaxRates } from "@/app/[locale]/(dashboard)/accounting/configuration/taxes/actions";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, vendors, products, taxRates] = await Promise.all([
    getPurchaseOrder(id),
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
    getTaxRates(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <PurchaseOrderForm
      order={order}
      vendors={vendors.data}
      products={products.products}
      taxRates={taxRates}
    />
  );
}
