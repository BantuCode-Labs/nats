"use server";

import { prisma } from "@/lib/prisma";
import { EntryStatus } from "@/prisma/generated/prisma/enums";
import { Prisma } from "@/prisma/generated/prisma/client";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { Decimal } from "decimal.js";

export interface CashBalanceReportEntry {
  accountId: string;
  accountName: string;
  accountType: string;
  accountNumber: string | null;
  bankName: string | null;
  glAccountId: string;
  beginningBalance: number;
  totalIn: number;
  totalOut: number;
  endingBalance: number;
}

export interface CashBalanceReportResult {
  entries: CashBalanceReportEntry[];
  totals: {
    beginningBalance: number;
    totalIn: number;
    totalOut: number;
    endingBalance: number;
  };
}

/**
 * Cash Balance Report filtered by period.
 * For each cash/bank account, computes:
 *   - beginning balance (sum of all posted journal lines before startDate)
 *   - in  (debit movements within the period — cash received)
 *   - out (credit movements within the period — cash paid out)
 *   - ending balance (beginning + in - out)
 */
export async function getCashBalanceReport(
  startDate: Date,
  endDate: Date,
): Promise<CashBalanceReportResult> {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "cash_bank.view")) {
    throw new Error("Unauthorized");
  }

  const accounts = await prisma.cashAccount.findMany({
    where: { isActive: true },
    include: { glAccount: true },
    orderBy: { name: "asc" },
  });

  if (accounts.length === 0) {
    return {
      entries: [],
      totals: {
        beginningBalance: 0,
        totalIn: 0,
        totalOut: 0,
        endingBalance: 0,
      },
    };
  }

  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const entries: CashBalanceReportEntry[] = await Promise.all(
    accounts.map(async (account) => {
      const glAccountId = account.glAccountId;

      // Beginning balance = sum of all posted lines with transactionDate < startDate
      const beginningAgg = await prisma.journalEntryLine.aggregate({
        where: {
          accountId: glAccountId,
          journalEntry: {
            status: EntryStatus.posted,
            transactionDate: { lt: startDate },
          },
        },
        _sum: { debitAmount: true, creditAmount: true },
      });

      const beginningBalance = new Decimal(
        beginningAgg._sum.debitAmount ?? 0,
      ).minus(new Decimal(beginningAgg._sum.creditAmount ?? 0)).toNumber();

      // Period movements
      const periodAgg = await prisma.journalEntryLine.aggregate({
        where: {
          accountId: glAccountId,
          journalEntry: {
            status: EntryStatus.posted,
            transactionDate: { gte: startDate, lte: endOfDay },
          },
        },
        _sum: { debitAmount: true, creditAmount: true },
      });

      const totalIn = new Decimal(
        periodAgg._sum.debitAmount ?? 0,
      ).toNumber();
      const totalOut = new Decimal(
        periodAgg._sum.creditAmount ?? 0,
      ).toNumber();

      const endingBalance = beginningBalance + totalIn - totalOut;

      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        accountNumber: account.accountNumber,
        bankName: account.bankName,
        glAccountId,
        beginningBalance,
        totalIn,
        totalOut,
        endingBalance,
      };
    }),
  );

  const totals = entries.reduce(
    (acc, e) => {
      acc.beginningBalance += e.beginningBalance;
      acc.totalIn += e.totalIn;
      acc.totalOut += e.totalOut;
      acc.endingBalance += e.endingBalance;
      return acc;
    },
    {
      beginningBalance: 0,
      totalIn: 0,
      totalOut: 0,
      endingBalance: 0,
    },
  );

  return { entries, totals };
}

export interface CashAccountPeriodBalancePoint {
  period: string; // e.g. "2026-01"
  periodLabel: string; // e.g. "Jan 2026"
  balance: number;
}

export interface CashAccountPeriodBalanceSeries {
  accountId: string;
  accountName: string;
  accountType: string;
  data: CashAccountPeriodBalancePoint[];
}

export interface CashAccountPeriodBalanceReportResult {
  series: CashAccountPeriodBalanceSeries[];
  periods: { period: string; periodLabel: string }[];
  totals: CashAccountPeriodBalancePoint[];
}

/**
 * Cash Account Balance per Period report.
 * For each cash/bank account, computes the ending balance for each month
 * in the [startDate, endDate] range. Also produces a combined total series.
 *
 * The balance for a given month-end is the cumulative sum of all posted
 * journal lines (debit - credit) up to and including the last day of that month.
 */
export async function getCashAccountBalancePerPeriod(
  startDate: Date,
  endDate: Date,
): Promise<CashAccountPeriodBalanceReportResult> {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "cash_bank.view")) {
    throw new Error("Unauthorized");
  }

  const accounts = await prisma.cashAccount.findMany({
    where: { isActive: true },
    include: { glAccount: true },
    orderBy: { name: "asc" },
  });

  // Build the list of month-end boundaries in the range
  const periods: { period: string; periodLabel: string; boundary: Date }[] = [];
  const cursor = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= endLimit) {
    // Last day of the cursor month
    const boundary = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const period = `${cursor.getFullYear()}-${String(
      cursor.getMonth() + 1,
    ).padStart(2, "0")}`;
    const periodLabel = cursor.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    periods.push({ period, periodLabel, boundary });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  if (accounts.length === 0 || periods.length === 0) {
    return { series: [], periods: [], totals: [] };
  }

  const series: CashAccountPeriodBalanceSeries[] = await Promise.all(
    accounts.map(async (account) => {
      // Cumulative balance up to each month boundary
      const data = await Promise.all(
        periods.map(async (p) => {
          const agg = await prisma.journalEntryLine.aggregate({
            where: {
              accountId: account.glAccountId,
              journalEntry: {
                status: EntryStatus.posted,
                transactionDate: { lte: p.boundary },
              },
            },
            _sum: { debitAmount: true, creditAmount: true },
          });
          const balance = new Decimal(
            agg._sum.debitAmount ?? 0,
          ).minus(new Decimal(agg._sum.creditAmount ?? 0)).toNumber();
          return {
            period: p.period,
            periodLabel: p.periodLabel,
            balance,
          };
        }),
      );

      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        data,
      };
    }),
  );

  // Combined total across all accounts per period
  const totals: CashAccountPeriodBalancePoint[] = periods.map((p, idx) => {
    const total = series.reduce(
      (sum, s) => sum + (s.data[idx]?.balance ?? 0),
      0,
    );
    return {
      period: p.period,
      periodLabel: p.periodLabel,
      balance: total,
    };
  });

  return {
    series,
    periods: periods.map(({ period, periodLabel }) => ({
      period,
      periodLabel,
    })),
    totals,
  };
}
