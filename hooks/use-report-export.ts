"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/use-toast";
import {
  createExportFile,
  downloadBase64File,
  EXPORT_LIMITS,
  type ExportColumn,
  type ExportFormat,
} from "@/lib/export";

export type UseReportExportOptions<T> = {
  /** Async fetcher that returns the FULL unpaginated dataset for export. */
  fetchRows: () => Promise<T[]>;
  /** Column definitions for the export file. */
  columns: ExportColumn<T>[] | (() => ExportColumn<T>[]);
  /** Base filename without extension. */
  filename: string | (() => string);
  /** Excel sheet name. */
  sheetName?: string;
  /** Optional estimated/known row count for large-export warning before fetch. */
  estimatedRowCount?: number;
};

export function useReportExport<T extends Record<string, unknown>>(
  options: UseReportExportOptions<T>,
) {
  const t = useTranslations("Common");
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(
    null,
  );

  const runExport = useCallback(
    async (format: ExportFormat) => {
      if (isExporting) return;

      const estimated = options.estimatedRowCount;
      if (
        typeof estimated === "number" &&
        estimated > EXPORT_LIMITS.WARN_ROW_COUNT
      ) {
        const proceed = window.confirm(
          t("export_large_dataset_warning", {
            count: estimated.toLocaleString(),
            max: EXPORT_LIMITS.MAX_ROW_COUNT.toLocaleString(),
          }),
        );
        if (!proceed) return;
      }

      setIsExporting(true);
      setExportingFormat(format);

      try {
        const rows = await options.fetchRows();

        if (!rows.length) {
          toast({
            title: t("error"),
            description: t("export_no_data"),
            variant: "destructive",
          });
          return;
        }

        if (rows.length > EXPORT_LIMITS.MAX_ROW_COUNT) {
          toast({
            title: t("error"),
            description: t("export_too_large", {
              max: EXPORT_LIMITS.MAX_ROW_COUNT.toLocaleString(),
            }),
            variant: "destructive",
          });
          return;
        }

        // Confirm after fetch if we didn't know the size and it's large
        if (
          (estimated === undefined || estimated <= EXPORT_LIMITS.WARN_ROW_COUNT) &&
          rows.length > EXPORT_LIMITS.WARN_ROW_COUNT
        ) {
          const proceed = window.confirm(
            t("export_large_dataset_warning", {
              count: rows.length.toLocaleString(),
              max: EXPORT_LIMITS.MAX_ROW_COUNT.toLocaleString(),
            }),
          );
          if (!proceed) return;
        }

        const columns =
          typeof options.columns === "function"
            ? options.columns()
            : options.columns;
        const filename =
          typeof options.filename === "function"
            ? options.filename()
            : options.filename;

        // Serialize rows to plain objects (strip class instances)
        const plainRows = rows.map((row) => {
          const plain: Record<string, unknown> = {};
          for (const col of columns) {
            if (col.accessor) {
              plain[col.key] = col.accessor(row);
            } else {
              plain[col.key] = row[col.key as keyof T];
            }
          }
          return plain;
        });

        // Columns without accessors (values already resolved into plainRows)
        const plainColumns: ExportColumn[] = columns.map((col) => ({
          key: col.key,
          header: col.header,
          format: col.format
            ? (value, r) =>
                col.format!(value, r as T)
            : undefined,
        }));

        const result = await createExportFile({
          rows: plainRows,
          columns: plainColumns,
          format,
          filename,
          sheetName: options.sheetName,
        });

        if (!result.success) {
          toast({
            title: t("error"),
            description: result.error || t("export_failed"),
            variant: "destructive",
          });
          return;
        }

        downloadBase64File(result.base64, result.filename, result.mimeType);

        toast({
          title: t("success"),
          description: t("export_success", { count: result.rowCount }),
        });
      } catch (error) {
        console.error("Export failed:", error);
        toast({
          title: t("error"),
          description:
            error instanceof Error ? error.message : t("export_failed"),
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
        setExportingFormat(null);
      }
    },
    [isExporting, options, t],
  );

  return {
    isExporting,
    exportingFormat,
    exportCsv: () => runExport("csv"),
    exportExcel: () => runExport("xlsx"),
    runExport,
  };
}
