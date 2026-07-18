"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getARAgingDetail, getARAgingSummary } from "./actions";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { Loader2, PrinterIcon } from "lucide-react";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";
import { useReportExport } from "@/hooks/use-report-export";
import { ReportExportButton } from "@/components/ui/report-export-button";
import type { ExportColumn } from "@/lib/export";

type ViewMode = "summary" | "detail";

export default function ARAgingPage() {
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const formatCurrency = useFormatCurrency();
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [viewMode, setViewMode] = useState<ViewMode>("summary");

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["sales-ar-aging-summary", asOfDate],
    queryFn: async () => await getARAgingSummary(new Date(asOfDate)),
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["sales-ar-aging-detail", asOfDate],
    queryFn: async () => await getARAgingDetail(new Date(asOfDate)),
  });

  const loading = viewMode === "summary" ? loadingSummary : loadingDetail;

  const summaryColumns: ExportColumn<Record<string, unknown>>[] = [
    { key: "contactName", header: t("reports_col_customer") },
    { key: "invoiceCount", header: t("reports_col_invoices") },
    { key: "current", header: t("reports_col_bucket_current") },
    { key: "bucket1", header: t("reports_col_bucket_1_30") },
    { key: "bucket2", header: t("reports_col_bucket_31_60") },
    { key: "bucket3", header: t("reports_col_bucket_61_90") },
    { key: "bucket4", header: t("reports_col_bucket_90_plus") },
    { key: "totalOutstanding", header: t("reports_col_outstanding") },
  ];

  const detailColumns: ExportColumn<Record<string, unknown>>[] = [
    { key: "contactName", header: t("reports_col_customer") },
    { key: "invoiceNumber", header: t("invoice_number") },
    { key: "invoiceDate", header: t("invoice_date") },
    { key: "dueDate", header: t("due_date") },
    { key: "totalAmount", header: t("reports_col_invoice_amount") },
    { key: "paidAmount", header: t("paid_amount") },
    { key: "balance", header: t("reports_col_balance") },
    { key: "daysOverdue", header: t("reports_col_days_overdue") },
    { key: "bucket", header: t("reports_col_bucket") },
  ];

  const { isExporting, exportingFormat, exportCsv, exportExcel } =
    useReportExport<Record<string, unknown>>({
      fetchRows: async () => {
        if (viewMode === "summary") {
          return (summary ?? []) as unknown as Array<Record<string, unknown>>;
        }
        return (detail ?? []) as unknown as Array<Record<string, unknown>>;
      },
      columns: viewMode === "summary" ? summaryColumns : detailColumns,
      filename: () =>
        viewMode === "summary"
          ? `ar-aging-summary-${asOfDate}`
          : `ar-aging-detail-${asOfDate}`,
      sheetName: viewMode === "summary" ? "AR Aging Summary" : "AR Aging Detail",
      estimatedRowCount:
        viewMode === "summary" ? summary?.length : detail?.length,
    });

  const summaryTotals = summary?.reduce(
    (acc, item) => {
      acc.current += item.current;
      acc.bucket1 += item.bucket1;
      acc.bucket2 += item.bucket2;
      acc.bucket3 += item.bucket3;
      acc.bucket4 += item.bucket4;
      acc.totalOutstanding += item.totalOutstanding;
      return acc;
    },
    { current: 0, bucket1: 0, bucket2: 0, bucket3: 0, bucket4: 0, totalOutstanding: 0 }
  );

  const detailTotals = detail?.reduce(
    (acc, item) => {
      acc.totalAmount += item.totalAmount;
      acc.paidAmount += item.paidAmount;
      acc.balance += item.balance;
      return acc;
    },
    { totalAmount: 0, paidAmount: 0, balance: 0 }
  );

  return (
    <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">{t("reports_ar_aging_heading")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("reports_ar_aging_subheading")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <PrinterIcon className="mr-2 h-4 w-4" />
              {tCommon("print")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-muted/20 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("reports_as_of")}</span>
            <CustomInput
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <ReportExportButton
              onExportCsv={exportCsv}
              onExportExcel={exportExcel}
              isExporting={isExporting}
              exportingFormat={exportingFormat}
              disabled={
                loading ||
                (viewMode === "summary"
                  ? !summary?.length
                  : !detail?.length)
              }
            />
            <Button
              variant={viewMode === "summary" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("summary")}
            >
              {t("reports_view_summary")}
            </Button>
            <Button
              variant={viewMode === "detail" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("detail")}
            >
              {t("reports_view_detail")}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "summary" ? (
          summary && summary.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reports_col_customer")}</TableHead>
                    <TableHead className="text-center">{t("reports_col_invoices")}</TableHead>
                    <TableHead className="text-right">{t("reports_col_bucket_current")}</TableHead>
                    <TableHead className="text-right">{t("reports_col_bucket_1_30")}</TableHead>
                    <TableHead className="text-right">{t("reports_col_bucket_31_60")}</TableHead>
                    <TableHead className="text-right">{t("reports_col_bucket_61_90")}</TableHead>
                    <TableHead className="text-right">{t("reports_col_bucket_90_plus")}</TableHead>
                    <TableHead className="text-right">{t("reports_col_outstanding")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((item) => (
                    <TableRow key={item.contactId}>
                      <TableCell className="font-medium">{item.contactName}</TableCell>
                      <TableCell className="text-center">{item.invoiceCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.current)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.bucket1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.bucket2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.bucket3)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.bucket4)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalOutstanding)}</TableCell>
                    </TableRow>
                  ))}
                  {summaryTotals && (
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell>{t("reports_total")}</TableCell>
                      <TableCell className="text-center">
                        {summary.reduce((s, i) => s + i.invoiceCount, 0)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(summaryTotals.current)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(summaryTotals.bucket1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(summaryTotals.bucket2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(summaryTotals.bucket3)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(summaryTotals.bucket4)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(summaryTotals.totalOutstanding)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              {t("reports_no_data")}
            </p>
          )
        ) : detail && detail.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports_col_customer")}</TableHead>
                  <TableHead>{t("invoice_number")}</TableHead>
                  <TableHead>{t("invoice_date")}</TableHead>
                  <TableHead>{t("due_date")}</TableHead>
                  <TableHead className="text-right">{t("reports_col_invoice_amount")}</TableHead>
                  <TableHead className="text-right">{t("paid_amount")}</TableHead>
                  <TableHead className="text-right">{t("reports_col_balance")}</TableHead>
                  <TableHead className="text-center">{t("reports_col_days_overdue")}</TableHead>
                  <TableHead className="text-center">{t("reports_col_bucket")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.map((item) => (
                  <TableRow key={`${item.contactId}-${item.invoiceNumber}`}>
                    <TableCell className="font-medium">{item.contactName}</TableCell>
                    <TableCell>{item.invoiceNumber}</TableCell>
                    <TableCell>{new Date(item.invoiceDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.paidAmount)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.balance)}</TableCell>
                    <TableCell className="text-center">{item.daysOverdue}</TableCell>
                    <TableCell className="text-center">{t(`reports_bucket_${item.bucket}`)}</TableCell>
                  </TableRow>
                ))}
                {detailTotals && (
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={4}>{t("reports_total")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(detailTotals.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(detailTotals.paidAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(detailTotals.balance)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">
            {t("reports_no_data")}
          </p>
        )}
      </div>
    </div>
  );
}
