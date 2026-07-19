export const dynamic = "force-dynamic";

import { getAccountById } from "../actions";
import LedgerClientPage from "../client-page";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const response = await getAccountById(decodedSlug);

  if (!response.success) {
    notFound();
  }
  if (!response.data) {
    notFound();
  }

  return <LedgerClientPage initialAccount={response.data} />;
}
