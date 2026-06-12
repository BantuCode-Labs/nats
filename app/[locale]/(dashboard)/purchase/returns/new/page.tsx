export const dynamic = "force-dynamic";

import {
  getPurchaseOrdersForReturn,
  getPurchaseInvoicesForReturn,
} from "../actions";
import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { PurchaseReturnForm } from "../_components/purchase-return-form";
import { Metadata } from "next";
import {
  getDepartments,
  getProjects,
} from "@/app/[locale]/(dashboard)/general/actions";

export const metadata: Metadata = {
  title: "New Purchase Return | NATS",
  description: "Create a new purchase return",
};

export default async function NewPurchaseReturnPage() {
  const [vendors, purchaseOrders, purchaseInvoices, departments, projects] =
    await Promise.all([
      getContacts({ type: ContactType.VENDOR }),
      getPurchaseOrdersForReturn(),
      getPurchaseInvoicesForReturn(),
      getDepartments(),
      getProjects(),
    ]);

  return (
    <PurchaseReturnForm
      vendors={vendors.data}
      purchaseOrders={purchaseOrders}
      purchaseInvoices={purchaseInvoices}
      departments={departments}
      projects={projects.projects}
    />
  );
}
