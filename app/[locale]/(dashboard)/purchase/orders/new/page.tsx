export const dynamic = "force-dynamic";

import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { PurchaseOrderForm } from "../_components/purchase-order-form";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { getTaxRates } from "@/app/[locale]/(dashboard)/accounting/configuration/taxes/actions";

export default async function Page() {
  const [vendors, products, departments, projects, taxRates] = await Promise.all([
    getContacts({ type: ContactType.VENDOR }),
    getProducts(),
    getDepartments(),
    getProjects(),
    getTaxRates(),
  ]);

  return (
    <PurchaseOrderForm
      vendors={vendors.data}
      products={products.products}
      departments={departments}
      projects={projects.projects}
      taxRates={taxRates}
    />
  );
}
