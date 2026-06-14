import { prisma } from "@/lib/prisma";
import { AITool } from "./types";
import {
  Prisma,
  ContactType,
  AccountType,
} from "@/prisma/generated/prisma/client";

// Helper function to convert data to markdown table
function toMarkdownTable(data: any[]): string {
  if (data.length === 0) return "No data found.";
  const headers = Object.keys(data[0]);
  const headerRow = `| ${headers.join(" | ")} |`;
  const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
  const rows = data
    .map(
      (row) =>
        `| ${Object.values(row)
          .map((val) => String(val ?? ""))
          .join(" | ")} |`,
    )
    .join("\n");
  return `${headerRow}\n${separatorRow}\n${rows}`;
}

export const getRecentTransactionsTool: AITool = {
  name: "get_recent_transactions",
  description:
    "Get recent financial transactions (journal entries) for the company. Use this to analyze financial activity.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Number of transactions to retrieve (default 5, max 20)",
      },
    },
    required: [],
  },
  handler: async ({ limit = 5 }: { limit?: number }) => {
    const transactions = await prisma.journalEntry.findMany({
      take: Math.min(limit, 20),
      orderBy: { transactionDate: "desc" },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    const data = transactions.map((t) => {
      const totalAmount = t.lines.reduce(
        (sum, line) => sum.add(line.debitAmount),
        new Prisma.Decimal(0),
      );
      return {
        Date: t.transactionDate.toISOString().split("T")[0],
        Description: t.description,
        Reference: t.entryNumber,
        Amount: totalAmount.toNumber().toFixed(2),
        Status: t.status,
      };
    });

    return toMarkdownTable(data);
  },
};

export const getInventoryStatusTool: AITool = {
  name: "get_inventory_status",
  description:
    "Get current inventory stock levels for products. Use this to check product availability.",
  parameters: {
    type: "object",
    properties: {
      search: {
        type: "string",
        description: "Search term for product name or SKU",
      },
    },
    required: [],
  },
  handler: async ({ search }: { search?: string }) => {
    const where: Prisma.ProductWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const products = await prisma.product.findMany({
      where,
      take: 10,
      select: {
        name: true,
        sku: true,
        price: true,
        cost: true,
        averageCost: true,
        inventory: {
          select: {
            quantity: true,
          },
        },
      },
    });

    const data = products.map((p) => {
      const totalQuantity = p.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0,
      );
      const estimatedValue = p.averageCost.mul(totalQuantity).toNumber();
      return {
        "Product Name": p.name,
        SKU: p.sku,
        "Stock Level": totalQuantity,
        Price: p.price.toNumber().toFixed(2),
        Value: estimatedValue.toFixed(2),
      };
    });

    return toMarkdownTable(data);
  },
};

export const getSalesSummaryTool: AITool = {
  name: "get_sales_summary",
  description:
    "Get a summary of sales performance including total sales and recent orders.",
  parameters: {
    type: "object",
    properties: {},
  },
  handler: async () => {
    const recentOrders = await prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        contact: { select: { name: true } },
      },
    });

    const totalSales = await prisma.salesInvoice.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: {
          in: ["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE"],
        },
      },
    });

    const totalSalesAmount = totalSales._sum.totalAmount?.toNumber() || 0;

    const data = recentOrders.map((o) => ({
      "Order ID": o.id.substring(0, 8) + "...",
      Customer: o.contact.name,
      Status: o.status,
      Total: o.totalAmount.toNumber().toFixed(2),
      Date: o.createdAt.toISOString().split("T")[0],
    }));

    let markdown = `**Total Sales Revenue:** $${totalSalesAmount.toFixed(2)}\n\n`;
    if (data.length > 0) {
      markdown += `**Recent Orders:**\n${toMarkdownTable(data)}`;
    } else {
      markdown += "No recent orders found.";
    }
    return markdown;
  },
};

export const getFinancialReportTool: AITool = {
  name: "get_financial_report",
  description:
    "Get key financial reports like Profit & Loss, Balance Sheet, Cash Flow summary.",
  parameters: {
    type: "object",
    properties: {
      reportType: {
        type: "string",
        enum: ["profit_loss", "balance_sheet", "cash_flow"],
        description: "Type of financial report to retrieve",
      },
    },
    required: ["reportType"],
  },
  handler: async ({ reportType }: { reportType: string }) => {
    if (reportType === "profit_loss") {
      const revenueAccounts = await prisma.account.findMany({
        where: { type: AccountType.revenue },
        include: { journalEntryLines: true },
      });
      const expenseAccounts = await prisma.account.findMany({
        where: { type: AccountType.expense },
        include: { journalEntryLines: true },
      });

      const totalRevenue = revenueAccounts.reduce(
        (sum, acc: any) =>
          sum.add(
            acc.journalEntryLines.reduce(
              (s: Prisma.Decimal, line: any) =>
                s.add(line.creditAmount).sub(line.debitAmount),
              new Prisma.Decimal(0),
            ),
          ),
        new Prisma.Decimal(0),
      );
      const totalExpenses = expenseAccounts.reduce(
        (sum, acc: any) =>
          sum.add(
            acc.journalEntryLines.reduce(
              (s: Prisma.Decimal, line: any) =>
                s.add(line.debitAmount).sub(line.creditAmount),
              new Prisma.Decimal(0),
            ),
          ),
        new Prisma.Decimal(0),
      );
      const netProfit = totalRevenue.sub(totalExpenses);

      return `**Profit & Loss Summary:**\n- Total Revenue: $${totalRevenue.toNumber().toFixed(2)}\n- Total Expenses: $${totalExpenses.toNumber().toFixed(2)}\n- Net Profit: $${netProfit.toNumber().toFixed(2)}`;
    }
    return `Report type ${reportType} summary available.`;
  },
};

export const getContactsTool: AITool = {
  name: "get_contacts",
  description: "Get list of customers and vendors.",
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["customer", "vendor", "all"],
        description: "Type of contact to retrieve",
      },
      limit: {
        type: "integer",
        description: "Number of contacts (default 10)",
      },
    },
    required: [],
  },
  handler: async ({
    type = "all",
    limit = 10,
  }: {
    type?: string;
    limit?: number;
  }) => {
    const where: Prisma.ContactWhereInput =
      type !== "all" ? { type: type.toUpperCase() as ContactType } : {};
    const contacts = await prisma.contact.findMany({
      where,
      take: limit,
      select: { name: true, email: true, phone: true, type: true },
    });
    return toMarkdownTable(contacts);
  },
};

export const getEmployeesTool: AITool = {
  name: "get_employees",
  description: "Get list of employees.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Number of employees (default 10)",
      },
    },
    required: [],
  },
  handler: async ({ limit = 10 }: { limit?: number }) => {
    const employees = await prisma.contact.findMany({
      where: { type: ContactType.EMPLOYEE },
      take: limit,
      select: {
        name: true,
        email: true,
        phone: true,
        employeeDetail: {
          select: {
            jobTitle: true,
            department: true,
          },
        },
      },
    });

    const data = employees.map((e) => ({
      Name: e.name,
      Email: e.email,
      Phone: e.phone,
      Position: e.employeeDetail?.jobTitle || "N/A",
      Department: e.employeeDetail?.department || "N/A",
    }));

    return toMarkdownTable(data);
  },
};

export const getAssetsTool: AITool = {
  name: "get_assets",
  description: "Get list of company assets.",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "integer", description: "Number of assets (default 10)" },
    },
    required: [],
  },
  handler: async ({ limit = 10 }: { limit?: number }) => {
    const assets = await prisma.asset.findMany({
      take: limit,
      select: {
        name: true,
        code: true,
        category: { select: { name: true } },
        purchaseDate: true,
        acquisitionCost: true,
        status: true,
      },
    });
    const data = assets.map((a) => ({
      Name: a.name,
      Code: a.code,
      Category: a.category.name,
      "Purchase Date": a.purchaseDate.toISOString().split("T")[0],
      Cost: a.acquisitionCost.toNumber().toFixed(2),
      Status: a.status,
    }));
    return toMarkdownTable(data);
  },
};

export const getBudgetsTool: AITool = {
  name: "get_budgets",
  description: "Get budget information.",
  parameters: {
    type: "object",
    properties: {
      limit: { type: "integer", description: "Number of budgets (default 10)" },
    },
    required: [],
  },
  handler: async ({ limit = 10 }: { limit?: number }) => {
    const budgets = await prisma.budget.findMany({
      take: limit,
      select: {
        name: true,
        fiscalYear: true,
        totalAmount: true,
        status: true,
      },
    });
    const data = budgets.map((b) => ({
      Name: b.name,
      Year: b.fiscalYear,
      Amount: b.totalAmount.toNumber().toFixed(2),
      Status: b.status,
    }));
    return toMarkdownTable(data);
  },
};

export const getWarehousesTool: AITool = {
  name: "get_warehouses",
  description: "Get list of warehouses and locations.",
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        description: "Number of warehouses (default 10)",
      },
    },
    required: [],
  },
  handler: async ({ limit = 10 }: { limit?: number }) => {
    const warehouses = await prisma.warehouse.findMany({
      take: limit,
      select: {
        name: true,
      },
    });
    return toMarkdownTable(warehouses);
  },
};

export const businessTools = [
  getRecentTransactionsTool,
  getInventoryStatusTool,
  getSalesSummaryTool,
  getFinancialReportTool,
  getContactsTool,
  getEmployeesTool,
  getAssetsTool,
  getBudgetsTool,
  getWarehousesTool,
];
