import type { ExportColumn } from "./types";

export type ExportJobId = "sales.ar_aging.summary" | "sales.ar_aging.detail";

export type ExportJobContext = {
  asOfDate?: string;
  [key: string]: unknown;
};

export type ExportJobDefinition = {
  id: ExportJobId;
  /** Permission required to run this export */
  permission: string;
  /** Default filename prefix (date suffix added by caller) */
  filename: (ctx: ExportJobContext) => string;
  sheetName: string;
  columns: ExportColumn[];
  fetchRows: (ctx: ExportJobContext) => Promise<Record<string, unknown>[]>;
};

/**
 * Server-side export jobs: rows are fetched on the server so the client
 * never ships large datasets over the wire.
 */
export const EXPORT_JOBS: Record<ExportJobId, ExportJobDefinition> = {
  "sales.ar_aging.summary": {
    id: "sales.ar_aging.summary",
    permission: "sales.view",
    filename: (ctx) => `ar-aging-summary-${ctx.asOfDate ?? "today"}`,
    sheetName: "AR Aging Summary",
    columns: [
      { key: "contactName", header: "Customer" },
      { key: "invoiceCount", header: "Invoices" },
      { key: "current", header: "Current" },
      { key: "bucket1", header: "1-30" },
      { key: "bucket2", header: "31-60" },
      { key: "bucket3", header: "61-90" },
      { key: "bucket4", header: "90+" },
      { key: "totalOutstanding", header: "Total Outstanding" },
    ],
    fetchRows: async (ctx) => {
      const { getARAgingSummary } = await import(
        "@/app/[locale]/(dashboard)/sales/reports/ar-aging/actions"
      );
      const asOf = ctx.asOfDate ? new Date(ctx.asOfDate) : new Date();
      const rows = await getARAgingSummary(asOf);
      return rows as unknown as Record<string, unknown>[];
    },
  },
  "sales.ar_aging.detail": {
    id: "sales.ar_aging.detail",
    permission: "sales.view",
    filename: (ctx) => `ar-aging-detail-${ctx.asOfDate ?? "today"}`,
    sheetName: "AR Aging Detail",
    columns: [
      { key: "contactName", header: "Customer" },
      { key: "invoiceNumber", header: "Invoice #" },
      { key: "invoiceDate", header: "Invoice Date" },
      { key: "dueDate", header: "Due Date" },
      { key: "totalAmount", header: "Total" },
      { key: "paidAmount", header: "Paid" },
      { key: "balance", header: "Balance" },
      { key: "daysOverdue", header: "Days Overdue" },
      { key: "bucket", header: "Bucket" },
    ],
    fetchRows: async (ctx) => {
      const { getARAgingDetail } = await import(
        "@/app/[locale]/(dashboard)/sales/reports/ar-aging/actions"
      );
      const asOf = ctx.asOfDate ? new Date(ctx.asOfDate) : new Date();
      const rows = await getARAgingDetail(asOf);
      return rows.map((r) => ({
        ...r,
        invoiceDate:
          r.invoiceDate instanceof Date
            ? r.invoiceDate.toISOString().slice(0, 10)
            : r.invoiceDate,
        dueDate:
          r.dueDate instanceof Date
            ? r.dueDate.toISOString().slice(0, 10)
            : r.dueDate,
      })) as unknown as Record<string, unknown>[];
    },
  },
};

export function getExportJob(id: string): ExportJobDefinition | null {
  return (EXPORT_JOBS as Record<string, ExportJobDefinition>)[id] ?? null;
}
