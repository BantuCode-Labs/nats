export const dynamic = "force-dynamic";

import { getContacts } from "@/app/[locale]/(dashboard)/general/contacts/actions";
import { ContactType } from "@/prisma/generated/prisma/enums";
import { SalesOrderForm } from "../_components/sales-order-form";
import { getProducts } from "@/app/[locale]/(dashboard)/inventory/products/actions";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/general/actions";
import { getTaxRates } from "@/app/[locale]/(dashboard)/accounting/configuration/taxes/actions";

export default async function Page() {
  const [customers, products, departments, projects, taxRates] = await Promise.all([
    getContacts({ type: ContactType.CUSTOMER }),
    getProducts(),
    getDepartments(),
    getProjects(),
    getTaxRates(),
  ]);

  return (
    <SalesOrderForm
      customers={customers.data}
      products={products.products}
      departments={departments}
      projects={projects.projects}
      taxRates={taxRates}
    />
  );
}
