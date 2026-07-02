export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { PurchasePaymentForm } from "../_components/purchase-payment-form";
import { getDepartments, getProjects } from "@/app/[locale]/(dashboard)/accounting/journal-entries/actions";

export const metadata: Metadata = {
  title: "New Purchase Payment | NATS",
  description: "Create a new purchase payment",
};

export default async function NewPurchasePaymentPage() {
  const departments = await getDepartments();
  const projects = await getProjects();

  return <PurchasePaymentForm departments={departments} projects={projects} />;
}
