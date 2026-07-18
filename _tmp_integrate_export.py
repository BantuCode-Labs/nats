#!/usr/bin/env python3
"""Integrate useReportExport + ReportExportButton into all tabular report pages."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

IMPORTS = """import { useReportExport } from "@/hooks/use-report-export";
import { ReportExportButton } from "@/components/ui/report-export-button";
import type { ExportColumn } from "@/lib/export";
"""

# path -> config
# fetch: JS expression for rows (inside async () => ...)
# columns: list of (key, header JS expr)
# filename: JS expression for filename
# sheet: str
# disabled: JS expr
# data_for_len: optional for estimatedRowCount

def C(key: str, header: str):
  return (key, header)


REPORTS: list[dict] = []


def add(path, fetch, columns, filename, sheet, disabled, estimated=None):
  REPORTS.append({
    "path": path,
    "fetch": fetch,
    "columns": columns,
    "filename": filename,
    "sheet": sheet,
    "disabled": disabled,
    "estimated": estimated,
  })


# ========== SALES ==========
add(
  "app/[locale]/(dashboard)/sales/reports/receivable/page.tsx",
  "report ?? []",
  [
    C("contactName", 't("reports_col_customer")'),
    C("openingBalance", 't("reports_col_opening_balance")'),
    C("invoiceAmount", 't("reports_col_invoice_additions")'),
    C("returnAmount", 't("reports_col_returns")'),
    C("paymentAmount", 't("reports_col_payments")'),
    C("closingBalance", 't("reports_col_closing_balance")'),
  ],
  "`sales-receivable-${startDate}-${endDate}`",
  "Receivable",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/sales/reports/customer-recap/page.tsx",
  "report ?? []",
  [
    C("contactName", 't("reports_col_customer")'),
    C("invoiceCount", 't("reports_col_invoices")'),
    C("totalInvoiceAmount", 't("reports_col_invoice_amount")'),
    C("totalReturnAmount", 't("reports_col_returns")'),
    C("totalPaymentAmount", 't("reports_col_payments")'),
    C("netSales", 't("reports_col_net_sales")'),
    C("outstanding", 't("reports_col_outstanding")'),
  ],
  "`sales-customer-recap-${startDate}-${endDate}`",
  "Customer Recap",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/sales/reports/sales-by-product/page.tsx",
  "report ?? []",
  [
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("quantitySold", 't("reports_col_qty_sold")'),
    C("grossAmount", 't("reports_col_gross_sales")'),
    C("discountAmount", 't("reports_col_discount")'),
    C("taxAmount", 't("reports_col_tax")'),
    C("netAmount", 't("reports_col_net_sales")'),
  ],
  "`sales-by-product-${startDate}-${endDate}`",
  "Sales by Product",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/sales/reports/tax-summary/page.tsx",
  "report ?? []",
  [
    C("taxRateName", 't("reports_col_tax_rate")'),
    C("taxRateCode", 't("reports_col_tax_code")'),
    C("rate", 't("reports_col_rate_percent")'),
    C("taxableAmount", 't("reports_col_taxable_amount")'),
    C("taxAmount", 't("reports_col_tax_amount")'),
    C("invoiceCount", 't("reports_col_invoices")'),
  ],
  "`sales-tax-summary-${startDate}-${endDate}`",
  "Tax Summary",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/sales/reports/profitability/page.tsx",
  "report ?? []",
  [
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("quantitySold", 't("reports_col_qty_sold")'),
    C("revenue", 't("reports_col_revenue")'),
    C("cogs", 't("reports_col_cogs")'),
    C("grossProfit", 't("reports_col_gross_profit")'),
    C("marginPct", 't("reports_col_margin")'),
  ],
  "`sales-profitability-${startDate}-${endDate}`",
  "Profitability",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/sales/reports/return-analysis/page.tsx",
  "report ?? []",
  [
    C("contactName", 't("reports_col_customer")'),
    C("returnCount", 't("reports_col_returns")'),
    C("returnAmount", 't("reports_col_return_amount")'),
    C("totalQtyReturned", 't("reports_col_qty")'),
    C("salesAmount", 't("reports_col_sales_amount")'),
    C("returnRate", 't("reports_col_return_rate")'),
    C("topReason", 't("reports_col_reason")'),
  ],
  "`sales-return-analysis-${startDate}-${endDate}`",
  "Return Analysis",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/sales/reports/sales-by-department/page.tsx",
  "report ?? []",
  [
    C("departmentCode", 't("reports_col_code")'),
    C("departmentName", 't("department")'),
    C("invoiceCount", 't("reports_col_invoices")'),
    C("totalInvoiceAmount", 't("reports_col_invoice_amount")'),
    C("totalReturnAmount", 't("reports_col_returns")'),
    C("totalPaymentAmount", 't("reports_col_payments")'),
    C("netSales", 't("reports_col_net_sales")'),
    C("outstanding", 't("reports_col_outstanding")'),
  ],
  "`sales-by-department-${startDate}-${endDate}`",
  "Sales by Department",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/sales/reports/pos-sales/page.tsx",
  "report ?? []",
  [
    C("sessionNumber", 't("reports_col_session")'),
    C("cashierName", 't("reports_col_cashier")'),
    C("warehouseName", 't("reports_col_warehouse")'),
    C("departmentName", 't("department")'),
    C("startTime", 't("reports_col_session_start")'),
    C("invoiceCount", 't("reports_col_invoices")'),
    C("grossSales", 't("reports_col_gross_sales")'),
    C("discountAmount", 't("reports_col_discount")'),
    C("taxAmount", 't("reports_col_tax")'),
    C("netSales", 't("reports_col_net_sales")'),
    C("cashPayments", 't("reports_col_cash")'),
    C("nonCashPayments", 't("reports_col_non_cash")'),
  ],
  "`pos-sales-${startDate}-${endDate}`",
  "POS Sales",
  "loading || !report?.length",
  "report?.length",
)

# ========== PURCHASE ==========
add(
  "app/[locale]/(dashboard)/purchase/reports/payable/page.tsx",
  "report ?? []",
  [
    C("contactName", 't("reports_col_vendor")'),
    C("openingBalance", 't("reports_col_opening_balance")'),
    C("invoiceAmount", 't("reports_col_invoice_additions")'),
    C("returnAmount", 't("reports_col_returns")'),
    C("paymentAmount", 't("reports_col_payments")'),
    C("closingBalance", 't("reports_col_closing_balance")'),
  ],
  "`purchase-payable-${startDate}-${endDate}`",
  "Payable",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/purchase/reports/vendor-recap/page.tsx",
  "report ?? []",
  [
    C("contactName", 't("reports_col_vendor")'),
    C("invoiceCount", 't("reports_col_invoices")'),
    C("totalInvoiceAmount", 't("reports_col_invoice_amount")'),
    C("totalReturnAmount", 't("reports_col_returns")'),
    C("totalPaymentAmount", 't("reports_col_payments")'),
    C("netPurchases", 't("reports_col_net_purchases")'),
    C("outstanding", 't("reports_col_outstanding")'),
  ],
  "`purchase-vendor-recap-${startDate}-${endDate}`",
  "Vendor Recap",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/purchase/reports/purchase-by-product/page.tsx",
  "report ?? []",
  [
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("quantityOrdered", 't("reports_col_qty_ordered")'),
    C("quantityReceived", 't("reports_col_qty_received")'),
    C("grossCost", 't("reports_col_gross_cost")'),
    C("avgUnitCost", 't("reports_col_avg_cost")'),
    C("orderCount", 't("reports_col_orders")'),
  ],
  "`purchase-by-product-${startDate}-${endDate}`",
  "Purchase by Product",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/purchase/reports/tax-summary/page.tsx",
  "report ?? []",
  [
    C("taxRateName", 't("reports_col_tax_rate")'),
    C("taxRateCode", 't("reports_col_tax_code")'),
    C("rate", 't("reports_col_rate_percent")'),
    C("taxableAmount", 't("reports_col_taxable_amount")'),
    C("taxAmount", 't("reports_col_tax_amount")'),
    C("invoiceCount", 't("reports_col_invoices")'),
  ],
  "`purchase-tax-summary-${startDate}-${endDate}`",
  "Tax Summary",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/purchase/reports/return-analysis/page.tsx",
  "report ?? []",
  [
    C("contactName", 't("reports_col_vendor")'),
    C("returnCount", 't("reports_col_returns")'),
    C("returnAmount", 't("reports_col_return_amount")'),
    C("totalQtyReturned", 't("reports_col_qty")'),
    C("purchaseAmount", 't("reports_col_purchase_amount")'),
    C("returnRate", 't("reports_col_return_rate")'),
    C("topReason", 't("reports_col_reason")'),
  ],
  "`purchase-return-analysis-${startDate}-${endDate}`",
  "Return Analysis",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/purchase/reports/purchase-by-department/page.tsx",
  "report ?? []",
  [
    C("departmentCode", 't("reports_col_code")'),
    C("departmentName", 't("department")'),
    C("invoiceCount", 't("reports_col_invoices")'),
    C("totalInvoiceAmount", 't("reports_col_invoice_amount")'),
    C("totalReturnAmount", 't("reports_col_returns")'),
    C("totalPaymentAmount", 't("reports_col_payments")'),
    C("netPurchases", 't("reports_col_net_purchases")'),
    C("outstanding", 't("reports_col_outstanding")'),
  ],
  "`purchase-by-department-${startDate}-${endDate}`",
  "Purchase by Department",
  "loading || !report?.length",
  "report?.length",
)

# ========== INVENTORY ==========
add(
  "app/[locale]/(dashboard)/inventory/products/reports/stock-valuation/page.tsx",
  "report ?? []",
  [
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("unitSymbol", 't("reports_col_unit")'),
    C("quantity", 't("reports_col_qty")'),
    C("unitCost", 't("reports_col_unit_cost")'),
    C("totalValue", 't("reports_col_total_value")'),
    C("sellingPrice", 't("reports_col_selling_price")'),
    C("potentialRevenue", 't("reports_col_potential_revenue")'),
  ],
  "`stock-valuation-${asOfDate}`" if False else "`stock-valuation`",
  "Stock Valuation",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/inventory/products/reports/low-stock/page.tsx",
  "report ?? []",
  [
    C("status", 't("reports_col_status")'),
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("warehouseName", 't("warehouse")'),
    C("quantity", 't("reports_col_qty")'),
    C("availableQty", 't("reports_col_available")'),
    C("reorderPoint", 't("reports_col_reorder_point")'),
    C("minStock", 't("reports_col_min_stock")'),
    C("deficit", 't("reports_col_deficit")'),
  ],
  "`low-stock`",
  "Low Stock",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/inventory/products/reports/stock-by-warehouse/page.tsx",
  "report ?? []",
  [
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("unitSymbol", 't("reports_col_unit")'),
    C("warehouseName", 't("warehouse")'),
    C("quantity", 't("reports_col_qty")'),
    C("quantityAllocated", 't("reports_col_allocated")'),
    C("availableQty", 't("reports_col_available")'),
  ],
  "`stock-by-warehouse`",
  "Stock by Warehouse",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/inventory/products/reports/movement-summary/page.tsx",
  "report ?? []",
  [
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("qtyIn", 't("reports_col_qty_in")'),
    C("qtyOut", 't("reports_col_qty_out")'),
    C("qtyTransfer", 't("reports_col_qty_transfer")'),
    C("qtyAdjustment", 't("reports_col_qty_adjustment")'),
    C("qtyProductionIn", 't("reports_col_qty_prod_in")'),
    C("qtyProductionOut", 't("reports_col_qty_prod_out")'),
    C("netChange", 't("reports_col_net_change")'),
    C("totalCostIn", 't("reports_col_cost_in")'),
    C("totalCostOut", 't("reports_col_cost_out")'),
  ],
  "`movement-summary-${startDate}-${endDate}`",
  "Movement Summary",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/inventory/products/reports/product-margin/page.tsx",
  "report ?? []",
  [
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("cost", 't("reports_col_cost")'),
    C("averageCost", 't("reports_col_avg_cost")'),
    C("sellingPrice", 't("reports_col_selling_price")'),
    C("marginAmount", 't("reports_col_margin_amount")'),
    C("marginPct", 't("reports_col_margin")'),
    C("stockQty", 't("reports_col_qty")'),
    C("stockValue", 't("reports_col_stock_value")'),
  ],
  "`product-margin`",
  "Product Margin",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/inventory/products/reports/slow-moving/page.tsx",
  "report ?? []",
  [
    C("status", 't("reports_col_status")'),
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("quantity", 't("reports_col_qty")'),
    C("stockValue", 't("reports_col_stock_value")'),
    C("daysSinceMovement", 't("reports_col_days_idle")'),
    C("lastMovementDate", 't("reports_col_last_movement")'),
    C("movementCountInPeriod", 't("reports_col_movements")'),
  ],
  "`slow-moving`",
  "Slow Moving",
  "loading || !report?.length",
  "report?.length",
)

# ========== CASH BANK (entries) ==========
add(
  "app/[locale]/(dashboard)/cash-bank/reports/cash-balance/page.tsx",
  "report?.entries ?? []",
  [
    C("accountName", 't("reports_col_account")'),
    C("accountType", 't("type")'),
    C("accountNumber", '"Account Number"'),
    C("bankName", '"Bank"'),
    C("beginningBalance", 't("reports_col_beginning_balance")'),
    C("totalIn", 't("reports_col_cash_in")'),
    C("totalOut", 't("reports_col_cash_out")'),
    C("endingBalance", 't("reports_col_ending_balance")'),
  ],
  "`cash-balance-${startDate}-${endDate}`",
  "Cash Balance",
  "loading || !report?.entries?.length",
  "report?.entries?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/daily-movement/page.tsx",
  "report?.entries ?? []",
  [
    C("date", 't("date")'),
    C("transactionCount", 't("reports_col_tx_count")'),
    C("cashIn", 't("reports_col_cash_in")'),
    C("cashOut", 't("reports_col_cash_out")'),
    C("net", 't("reports_col_net")'),
  ],
  "`cash-daily-movement-${startDate}-${endDate}`",
  "Daily Movement",
  "loading || !report?.entries?.length",
  "report?.entries?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/transfers/page.tsx",
  "report?.entries ?? []",
  [
    C("date", 't("date")'),
    C("reference", 't("reports_col_reference")'),
    C("fromAccount", 't("reports_col_from")'),
    C("toAccount", 't("reports_col_to")'),
    C("amount", 't("reports_col_amount")'),
    C("status", 'tCommon("status")'),
    C("notes", 't("reports_col_notes")'),
  ],
  "`cash-transfers-${startDate}-${endDate}`",
  "Transfers",
  "loading || !report?.entries?.length",
  "report?.entries?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/by-department/page.tsx",
  "report?.entries ?? []",
  [
    C("departmentName", 't("department")'),
    C("cashIn", 't("reports_col_cash_in")'),
    C("cashOut", 't("reports_col_cash_out")'),
    C("net", 't("reports_col_net")'),
    C("transactionCount", 't("reports_col_tx_count")'),
  ],
  "`cash-by-department-${startDate}-${endDate}`",
  "By Department",
  "loading || !report?.entries?.length",
  "report?.entries?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/by-project/page.tsx",
  "report?.entries ?? []",
  [
    C("projectName", 't("project")'),
    C("cashIn", 't("reports_col_cash_in")'),
    C("cashOut", 't("reports_col_cash_out")'),
    C("net", 't("reports_col_net")'),
    C("transactionCount", 't("reports_col_tx_count")'),
  ],
  "`cash-by-project-${startDate}-${endDate}`",
  "By Project",
  "loading || !report?.entries?.length",
  "report?.entries?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/cash-by-contact/page.tsx",
  "report?.entries ?? []",
  [
    C("contactName", 't("reports_col_contact")'),
    C("cashIn", 't("reports_col_cash_in")'),
    C("cashOut", 't("reports_col_cash_out")'),
    C("net", 't("reports_col_net")'),
    C("transactionCount", 't("reports_col_tx_count")'),
  ],
  "`cash-by-contact-${startDate}-${endDate}`",
  "By Contact",
  "loading || !report?.entries?.length",
  "report?.entries?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/income-by-account/page.tsx",
  "report?.entries ?? []",
  [
    C("accountCode", 't("reports_col_code")'),
    C("accountName", 't("reports_col_account")'),
    C("amount", 't("reports_col_amount")'),
    C("transactionCount", 't("reports_col_tx_count")'),
  ],
  "`income-by-account-${startDate}-${endDate}`",
  "Income by Account",
  "loading || !report?.entries?.length",
  "report?.entries?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/expense-by-account/page.tsx",
  "report?.entries ?? []",
  [
    C("accountCode", 't("reports_col_code")'),
    C("accountName", 't("reports_col_account")'),
    C("amount", 't("reports_col_amount")'),
    C("transactionCount", 't("reports_col_tx_count")'),
  ],
  "`expense-by-account-${startDate}-${endDate}`",
  "Expense by Account",
  "loading || !report?.entries?.length",
  "report?.entries?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/cash-flow/page.tsx",
  "report?.entries ?? report?.points ?? report ?? []",
  [
    C("period", 't("reports_col_period")'),
    C("periodLabel", 't("reports_col_period")'),
    C("cashIn", 't("reports_col_cash_in")'),
    C("cashOut", 't("reports_col_cash_out")'),
    C("net", 't("reports_col_net")'),
  ],
  "`cash-flow-summary-${startDate}-${endDate}`",
  "Cash Flow",
  "loading || !(report?.entries?.length || report?.points?.length || (Array.isArray(report) && report.length))",
  "report?.entries?.length ?? report?.points?.length",
)
add(
  "app/[locale]/(dashboard)/cash-bank/reports/period-balance/page.tsx",
  "report?.totals ?? []",
  [
    C("period", 't("reports_col_period")'),
    C("periodLabel", 't("reports_col_period")'),
    C("balance", 't("reports_col_balance")'),
  ],
  "`period-balance`",
  "Period Balance",
  "loading || !report?.totals?.length",
  "report?.totals?.length",
)

# ========== ASSETS ==========
add(
  "app/[locale]/(dashboard)/assets/reports/register/page.tsx",
  "report ?? []",
  [
    C("code", 't("code")'),
    C("name", 't("name")'),
    C("categoryName", 't("category")'),
    C("status", 'tCommon("status")'),
    C("purchaseDate", 't("purchase_date")'),
    C("acquisitionCost", 't("acquisition_cost")'),
    C("accumulatedDepreciation", 't("reports_col_accum_dep")'),
    C("currentBookValue", 't("book_value")'),
    C("location", 't("reports_col_location")'),
    C("department", 't("department")'),
  ],
  "`asset-register`",
  "Asset Register",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/assets/reports/by-category/page.tsx",
  "report ?? []",
  [
    C("categoryCode", 't("reports_col_code")'),
    C("categoryName", 't("category")'),
    C("assetCount", 't("reports_col_count")'),
    C("activeCount", 't("reports_col_active")'),
    C("disposedCount", 't("reports_col_disposed")'),
    C("totalAcquisitionCost", 't("acquisition_cost")'),
    C("totalBookValue", 't("book_value")'),
    C("totalAccumulatedDepreciation", 't("reports_col_accum_dep")'),
  ],
  "`assets-by-category`",
  "By Category",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/assets/reports/by-location/page.tsx",
  "report ?? []",
  [
    C("groupType", 't("reports_col_type")'),
    C("groupName", 't("reports_col_location")'),
    C("assetCount", 't("reports_col_count")'),
    C("activeCount", 't("reports_col_active")'),
    C("totalAcquisitionCost", 't("acquisition_cost")'),
    C("totalBookValue", 't("book_value")'),
  ],
  "`assets-by-location`",
  "By Location",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/assets/reports/depreciation/page.tsx",
  "report ?? []",
  [
    C("code", 't("code")'),
    C("name", 't("name")'),
    C("categoryName", 't("category")'),
    C("status", 'tCommon("status")'),
    C("acquisitionCost", 't("acquisition_cost")'),
    C("currentBookValue", 't("book_value")'),
    C("totalPosted", 't("reports_col_posted")'),
    C("totalPending", 't("reports_col_pending")'),
    C("lastPostedDate", 't("reports_col_last_posted")'),
    C("nextDueDate", 't("reports_col_next_due")'),
  ],
  "`asset-depreciation`",
  "Depreciation",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/assets/reports/disposal/page.tsx",
  "report ?? []",
  [
    C("assetCode", 't("code")'),
    C("assetName", 't("name")'),
    C("categoryName", 't("category")'),
    C("disposalDate", 't("reports_col_disposal_date")'),
    C("disposalAmount", 't("reports_col_disposal_amount")'),
    C("bookValue", 't("book_value")'),
    C("gainLoss", 't("reports_col_gain_loss")'),
    C("reason", 't("reports_col_reason")'),
    C("status", 'tCommon("status")'),
  ],
  "`asset-disposal`",
  "Disposal",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/assets/reports/valuation/page.tsx",
  "report ?? []",
  [
    C("code", 't("code")'),
    C("name", 't("name")'),
    C("categoryName", 't("category")'),
    C("status", 'tCommon("status")'),
    C("purchaseDate", 't("purchase_date")'),
    C("acquisitionCost", 't("acquisition_cost")'),
    C("currentBookValue", 't("book_value")'),
    C("accumulatedDepreciation", 't("reports_col_accum_dep")'),
    C("depreciationPct", 't("reports_col_dep_pct")'),
    C("remainingLifeMonths", 't("reports_col_remaining_life")'),
  ],
  "`asset-valuation`",
  "Valuation",
  "loading || !report?.length",
  "report?.length",
)

# ========== BUDGETING ==========
add(
  "app/[locale]/(dashboard)/budgeting/reports/variance/page.tsx",
  "report ?? []",
  [
    C("budgetName", 't("reports_col_budget")'),
    C("status", 'tCommon("status")'),
    C("department", 't("reports_col_department")'),
    C("project", 't("reports_col_project")'),
    C("totalBudget", 't("reports_col_budgeted")'),
    C("totalActual", 't("reports_col_actual")'),
    C("variance", 't("reports_col_variance")'),
    C("utilizationPct", 't("reports_col_utilization")'),
    C("overBudgetItems", 't("reports_col_over_items")'),
  ],
  "`budget-variance-${fiscalYear}`",
  "Variance",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/budgeting/reports/by-department/page.tsx",
  "report ?? []",
  [
    C("departmentCode", 't("reports_col_code")'),
    C("departmentName", 't("reports_col_department")'),
    C("budgetCount", 't("reports_col_budgets")'),
    C("totalBudget", 't("reports_col_budgeted")'),
    C("totalActual", 't("reports_col_actual")'),
    C("variance", 't("reports_col_variance")'),
    C("utilizationPct", 't("reports_col_utilization")'),
    C("overBudgetCount", 't("reports_col_over_budgets")'),
  ],
  "`budget-by-department-${fiscalYear}`",
  "By Department",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/budgeting/reports/by-project/page.tsx",
  "report ?? []",
  [
    C("projectCode", 't("reports_col_code")'),
    C("projectName", 't("reports_col_project")'),
    C("projectStatus", 'tCommon("status")'),
    C("budgetCount", 't("reports_col_budgets")'),
    C("totalBudget", 't("reports_col_budgeted")'),
    C("totalActual", 't("reports_col_actual")'),
    C("variance", 't("reports_col_variance")'),
    C("utilizationPct", 't("reports_col_utilization")'),
  ],
  "`budget-by-project-${fiscalYear}`",
  "By Project",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/budgeting/reports/monthly/page.tsx",
  "report ?? []",
  [
    C("monthName", 't("reports_col_month")'),
    C("budgeted", 't("reports_col_budgeted")'),
    C("actual", 't("reports_col_actual")'),
    C("variance", 't("reports_col_variance")'),
    C("utilizationPct", 't("reports_col_utilization")'),
  ],
  "`budget-monthly-${fiscalYear}`",
  "Monthly",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/budgeting/reports/overspending/page.tsx",
  "report ?? []",
  [
    C("severity", 't("reports_col_severity")'),
    C("budgetName", 't("reports_col_budget")'),
    C("accountCode", 't("reports_col_code")'),
    C("accountName", 't("reports_col_account")'),
    C("department", 't("reports_col_department")'),
    C("project", 't("reports_col_project")'),
    C("budgeted", 't("reports_col_budgeted")'),
    C("actual", 't("reports_col_actual")'),
    C("variance", 't("reports_col_variance")'),
    C("utilizationPct", 't("reports_col_utilization")'),
  ],
  "`budget-overspending-${fiscalYear}`",
  "Overspending",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/budgeting/reports/status/page.tsx",
  "report?.byStatus ?? report?.statusSummary ?? []",
  [
    C("status", 'tCommon("status")'),
    C("count", 't("reports_col_count")'),
    C("totalAmount", 't("reports_col_total_amount")'),
  ],
  "`budget-status-${fiscalYear}`",
  "Status",
  "loading || !report",
  None,
)

# ========== PRODUCTION ==========
add(
  "app/[locale]/(dashboard)/production/reports/order-status/page.tsx",
  "report ?? []",
  [
    C("orderNumber", 't("reports_col_order")'),
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("status", 'tCommon("status")'),
    C("plannedQuantity", 't("reports_col_planned")'),
    C("producedQuantity", 't("reports_col_produced")'),
    C("remainingQuantity", 't("reports_col_remaining")'),
    C("completionPct", 't("reports_col_completion")'),
    C("materialCost", 't("reports_col_material_cost")'),
    C("finishedGoodsValue", 't("reports_col_fg_value")'),
  ],
  "`production-order-status`",
  "Order Status",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/production/reports/material-consumption/page.tsx",
  "report ?? []",
  [
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("categoryName", 't("reports_col_category")'),
    C("totalQuantity", 't("reports_col_qty")'),
    C("totalCost", 't("reports_col_cost")'),
    C("avgUnitCost", 't("reports_col_avg_cost")'),
    C("issueCount", 't("reports_col_issues")'),
    C("orderCount", 't("reports_col_orders")'),
  ],
  "`material-consumption-${startDate}-${endDate}`",
  "Material Consumption",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/production/reports/output-yield/page.tsx",
  "report ?? []",
  [
    C("orderNumber", 't("reports_col_order")'),
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("status", 'tCommon("status")'),
    C("plannedQuantity", 't("reports_col_planned")'),
    C("producedQuantity", 't("reports_col_produced")'),
    C("yieldPct", 't("reports_col_yield")'),
    C("varianceQty", 't("reports_col_variance")'),
    C("finishedGoodsValue", 't("reports_col_fg_value")'),
    C("unitCost", 't("reports_col_unit_cost")'),
  ],
  "`output-yield-${startDate}-${endDate}`",
  "Output Yield",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/production/reports/cost-analysis/page.tsx",
  "report ?? []",
  [
    C("orderNumber", 't("reports_col_order")'),
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("status", 'tCommon("status")'),
    C("plannedQuantity", 't("reports_col_planned")'),
    C("producedQuantity", 't("reports_col_produced")'),
    C("materialCost", 't("reports_col_material_cost")'),
    C("finishedGoodsValue", 't("reports_col_fg_value")'),
    C("wipBalance", 't("reports_col_wip")'),
    C("unitMaterialCost", 't("reports_col_unit_material")'),
    C("costVariance", 't("reports_col_variance")'),
  ],
  "`production-cost-analysis-${startDate}-${endDate}`",
  "Cost Analysis",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/production/reports/bom-cost/page.tsx",
  "report ?? []",
  [
    C("bomNumber", 't("reports_col_bom")'),
    C("bomName", 't("name")'),
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("outputQty", 't("reports_col_output_qty")'),
    C("materialCount", 't("reports_col_materials")'),
    C("estimatedUnitCost", 't("reports_col_est_unit_cost")'),
    C("estimatedTotalCost", 't("reports_col_est_total")'),
    C("actualAvgUnitCost", 't("reports_col_actual_unit")'),
    C("costVariance", 't("reports_col_variance")'),
  ],
  "`bom-cost`",
  "BOM Cost",
  "loading || !report?.length",
  "report?.length",
)
add(
  "app/[locale]/(dashboard)/production/reports/wip/page.tsx",
  "report ?? []",
  [
    C("orderNumber", 't("reports_col_order")'),
    C("productSku", 't("reports_col_sku")'),
    C("productName", 't("reports_col_product")'),
    C("status", 'tCommon("status")'),
    C("plannedQuantity", 't("reports_col_planned")'),
    C("producedQuantity", 't("reports_col_produced")'),
    C("remainingQuantity", 't("reports_col_remaining")'),
    C("materialCost", 't("reports_col_material_cost")'),
    C("finishedGoodsValue", 't("reports_col_fg_value")'),
    C("wipBalance", 't("reports_col_wip")'),
    C("daysOpen", 't("reports_col_days_open")'),
  ],
  "`production-wip`",
  "WIP",
  "loading || !report?.length",
  "report?.length",
)

# ========== ACCOUNTING tax-summary ==========
add(
  "app/[locale]/(dashboard)/accounting/reports/tax-summary/page.tsx",
  "report ?? []",
  [
    C("taxName", '"Tax"'),
    C("taxCode", '"Code"'),
    C("outputBase", '"Output Base"'),
    C("outputTax", '"Output Tax"'),
    C("inputBase", '"Input Base"'),
    C("inputTax", '"Input Tax"'),
    C("netTax", '"Net Tax"'),
  ],
  "`accounting-tax-summary-${startDate}-${endDate}`",
  "Tax Summary",
  "loading || !report?.length",
  "report?.length",
)


def inject_imports(content: str) -> str:
  if "use-report-export" in content:
    return content
  # find last import
  lines = content.splitlines(keepends=True)
  last = 0
  for i, line in enumerate(lines):
    if re.match(r'^import\s', line) or (line.strip().startswith("} from ") or line.strip().startswith('} from "') or line.strip().startswith("} from '")):
      last = i
    if "from \"" in line or "from '" in line:
      last = i
  lines.insert(last + 1, IMPORTS if IMPORTS.endswith("\n") else IMPORTS + "\n")
  return "".join(lines)


def make_hook(cfg: dict) -> str:
  col_lines = "\n".join(
    f'    {{ key: "{k}", header: {h} }},' for k, h in cfg["columns"]
  )
  est = ""
  if cfg.get("estimated"):
    est = f"\n      estimatedRowCount: {cfg['estimated']},"
  return f"""
  const exportColumns: ExportColumn<Record<string, unknown>>[] = [
{col_lines}
  ];

  const {{ isExporting, exportingFormat, exportCsv, exportExcel }} =
    useReportExport<Record<string, unknown>>({{
      fetchRows: async () =>
        ({cfg['fetch']}) as Array<Record<string, unknown>>,
      columns: exportColumns,
      filename: () => {cfg['filename']},
      sheetName: "{cfg['sheet']}",{est}
    }});
"""


def inject_hook(content: str, hook: str) -> str:
  if "exportCsv" in content and "useReportExport" in content:
    return content
  # Insert before the main return of the default export function
  m = re.search(r"export default function \w+", content)
  if not m:
    raise RuntimeError("no default export function")
  # Find first `  return (` after that which is the component return
  # Prefer the one that contains flex flex-1
  idx = content.find("export default function")
  # Search for return statements
  for match in re.finditer(r"\n  return \(", content[idx:]):
    pos = idx + match.start()
    # peek ahead for flex flex-1 or PageListLayout
    window = content[pos:pos + 400]
    if "flex flex-1" in window or "PageListLayout" in window or "flex-col gap" in window:
      return content[:pos] + "\n" + hook + content[pos:]
  # fallback: last "  return (" in file before final closing
  matches = list(re.finditer(r"\n  return \(", content[idx:]))
  if not matches:
    raise RuntimeError("no return found")
  pos = idx + matches[-1].start()
  return content[:pos] + "\n" + hook + content[pos:]


BUTTON_TMPL = """            <ReportExportButton
              onExportCsv={{exportCsv}}
              onExportExcel={{exportExcel}}
              isExporting={{isExporting}}
              exportingFormat={{exportingFormat}}
              disabled={{{disabled}}}
            />
"""


def inject_button(content: str, disabled: str) -> str:
  if "<ReportExportButton" in content:
    return content
  btn = f"""            <ReportExportButton
              onExportCsv={{exportCsv}}
              onExportExcel={{exportExcel}}
              isExporting={{isExporting}}
              exportingFormat={{exportingFormat}}
              disabled={{{disabled}}}
            />
"""
  # Pattern 1: insert right after opening toolbar div that contains print
  m = re.search(
    r'(<div className="flex items-center gap-2">\s*)',
    content,
  )
  if m:
    # Check nearby has print or run report
    nearby = content[m.start(): m.start() + 500]
    if "print" in nearby.lower() or "refetch" in nearby or "Run" in nearby or "reports_run" in nearby:
      return content[: m.end()] + btn + content[m.end() :]

  # Pattern 2: after print button
  m = re.search(
    r'(<Button variant="outline"[^>]*>[\s\S]*?PrinterIcon[\s\S]*?</Button>\s*)',
    content,
  )
  if m:
    return content[: m.end()] + btn + content[m.end() :]

  # Pattern 3: flex justify-between toolbar
  m = re.search(
    r'(<div className="flex justify-between items-center">[\s\S]*?<div className="flex items-center gap-[24]">\s*)',
    content,
  )
  if m:
    return content[: m.end()] + btn + content[m.end() :]

  raise RuntimeError("toolbar not found")


def process(cfg: dict) -> str:
  path = ROOT / cfg["path"]
  if not path.exists():
    return f"MISSING: {cfg['path']}"
  content = path.read_text()
  if "useReportExport" in content and "ReportExportButton" in content:
    return f"SKIP: {cfg['path']}"

  # Fix filenames that need vars present in file
  filename = cfg["filename"]
  if "asOfDate" in filename and "asOfDate" not in content:
    # try date or endDate
    if re.search(r"\bconst \[date,", content) or re.search(r"\b\[date,", content):
      filename = filename.replace("asOfDate", "date")
    elif "endDate" in content:
      filename = filename.replace("${asOfDate}", "${endDate}")
    else:
      filename = filename.replace("-${asOfDate}", "")
  if "startDate" in filename and "startDate" not in content:
    filename = re.sub(r"-\$\{startDate\}", "", filename)
  if "endDate" in filename and "endDate" not in content:
    filename = re.sub(r"-\$\{endDate\}", "", filename)
  if "fiscalYear" in filename and "fiscalYear" not in content:
    filename = filename.replace("-${fiscalYear}", "")
  cfg = {**cfg, "filename": filename}

  content = inject_imports(content)
  hook = make_hook(cfg)
  content = inject_hook(content, hook)
  content = inject_button(content, cfg["disabled"])
  path.write_text(content)
  return f"OK: {cfg['path']}"


def main():
  results = []
  for cfg in REPORTS:
    try:
      results.append(process(cfg))
    except Exception as e:
      results.append(f"FAIL: {cfg['path']}: {e}")
  print("\n".join(results))
  ok = sum(1 for r in results if r.startswith("OK"))
  fail = sum(1 for r in results if r.startswith("FAIL"))
  skip = sum(1 for r in results if r.startswith("SKIP"))
  print(f"\nSummary: {ok} ok, {skip} skip, {fail} fail, {len(results)} total")


if __name__ == "__main__":
  main()
