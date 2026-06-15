import { IntegrationEvent } from "../events";

import { Decimal } from "decimal.js";
import { getRequiredDefaultAccount } from "@/lib/accounting/default-account.service";
import { JournalService } from "@/modules/accounting/services/journal.service";
import type { Prisma } from "@/prisma/generated/prisma/client";
import { generateDocumentNumber } from "@/lib/document-numbering";

type Tx = Prisma.TransactionClient;

export const handlePayrollRunCompleted = async (
  tx: Tx,
  payload: Extract<
    IntegrationEvent,
    { type: "PAYROLL_RUN_COMPLETED" }
  >["payload"],
) => {
  console.log("Handling PAYROLL_RUN_COMPLETED event", payload);

  const run = await tx.payrollRun.findUnique({
    where: { id: payload.payrollRunId },
  });

  if (!run) throw new Error("Payroll run not found");
  if (run.journalEntryId) return; // Already processed

  const expenseAccount = await getRequiredDefaultAccount("SALARIES_EXPENSE");
  const liabilityAccount = await getRequiredDefaultAccount("PAYROLL_LIABILITY");

  const totalAmount = new Decimal(payload.totalAmount);
  // Note: In a real scenario, total earnings might be higher than net pay due to deductions.
  // Ideally:
  // Dr Salaries Expense (Total Earnings)
  // Cr Taxes Payable (Tax Deductions)
  // Cr Other Deductions Payable
  // Cr Salaries Payable (Net Pay)
  // The payload.totalAmount currently represents Net Pay based on previous service code.
  // However, the event payload also has access to Run ID, so we can fetch details if needed.
  // For now, let's look at the PayrollRun model again. It has totalEarnings, totalDeductions, netPay.
  // We should use those values from the DB record `run` we just fetched for accuracy.

  const totalEarnings = new Decimal(run.totalEarnings);
  const totalDeductions = new Decimal(run.totalDeductions);
  const netPay = new Decimal(run.netPay);

  const jeLines = [];

  // Dr Salaries Expense (Gross)
  if (totalEarnings.gt(0)) {
    jeLines.push({
      accountId: expenseAccount.accountId,
      debitAmount: totalEarnings.toNumber(),
      creditAmount: 0,
      description: `Salaries Expense for Period ${run.periodId}`,
    });
  }

  // Cr Payroll Liability (Net Pay)
  if (netPay.gt(0)) {
    jeLines.push({
      accountId: liabilityAccount.accountId,
      debitAmount: 0,
      creditAmount: netPay.toNumber(),
      description: `Net Pay Payable for Period ${run.periodId}`,
    });
  }

  // Cr Payroll Liability (Deductions) - simplistic for now, ideally separate accounts
  if (totalDeductions.gt(0)) {
    jeLines.push({
      accountId: liabilityAccount.accountId,
      debitAmount: 0,
      creditAmount: totalDeductions.toNumber(),
      description: `Payroll Deductions for Period ${run.periodId}`,
    });
  }

  // Create JE
  const entryNumber = await generateDocumentNumber(
    "PAYROLL_JOURNAL",
    "Payroll Journal",
    "PAY",
  );
  const journalEntry = await JournalService.createJournalEntry(
    {
      entryNumber,
      transactionDate: run.runDate,
      description: `Payroll Run ${run.id}`,
      lines: jeLines,
    },
    payload.userId,
    tx,
  );

  // Post JE
  await JournalService.postJournalEntry(journalEntry.id, tx);

  // Link back
  await tx.payrollRun.update({
    where: { id: run.id },
    data: { journalEntryId: journalEntry.id },
  });
};

export const handleSalarySlipPublished = async (
  tx: Tx,
  payload: Extract<
    IntegrationEvent,
    { type: "SALARY_SLIP_PUBLISHED" }
  >["payload"],
) => {
  console.log("Handling SALARY_SLIP_PUBLISHED event", payload);
  // Placeholder: Send email to employee or notify
};
