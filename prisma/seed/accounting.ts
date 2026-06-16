import { prisma } from "./utils";
import {
  CashAccountType,
  AccountType,
  NormalBalance,
  DefaultAccountPurpose,
  EntryStatus,
} from "../generated/prisma/client";
import { Decimal } from "decimal.js";

/**
 * Compute the running balance for a single line given the previous balance
 * for the account and its normal balance direction.
 */
function computeRunningBalance(
  previousBalance: Decimal,
  debit: Decimal,
  credit: Decimal,
  normalBalance: NormalBalance,
): Decimal {
  if (normalBalance === NormalBalance.debit) {
    return previousBalance.plus(debit).minus(credit);
  }
  return previousBalance.plus(credit).minus(debit);
}

/**
 * Recompute `runningBalance` for every line of every posted JournalEntry in
 * chronological order and persist the resulting aggregate to `AccountBalance`.
 *
 * Safe to call multiple times (idempotent). Should be invoked at the very end
 * of the seeding process, after every other module has produced its JEs.
 */
export async function reconcileJournalEntries() {
  console.log("Reconciling JournalEntry running balances & AccountBalance...");

  // Reset all AccountBalance rows to 0 so we recompute from scratch.
  await prisma.accountBalance.updateMany({ data: { balance: 0 } });

  // Pull all accounts once so we know the normal-balance direction.
  const accounts = await prisma.account.findMany();
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Pull all posted JEs in chronological order, oldest first.
  const entries = await prisma.journalEntry.findMany({
    where: { status: EntryStatus.posted },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
    include: { lines: { orderBy: { lineNumber: "asc" } } },
  });

  // Track in-memory running balance per account while we walk the JEs.
  const running = new Map<string, Decimal>();

  for (const je of entries) {
    for (const line of je.lines) {
      const account = accountMap.get(line.accountId);
      if (!account) continue;

      const previous = running.get(line.accountId) ?? new Decimal(0);
      const debit = new Decimal(line.debitAmount ?? 0);
      const credit = new Decimal(line.creditAmount ?? 0);

      const next = computeRunningBalance(
        previous,
        debit,
        credit,
        account.normalBalance,
      );

      running.set(line.accountId, next);

      await prisma.journalEntryLine.update({
        where: { id: line.id },
        data: { runningBalance: next },
      });
    }
  }

  // Persist final aggregate balances.
  for (const [accountId, balance] of running) {
    await prisma.accountBalance.update({
      where: { accountId },
      data: { balance },
    });
  }

  console.log(
    `  ✔ Reconciled ${entries.length} journal entries across ${running.size} accounts.`,
  );
}

/**
 * Create a posted JournalEntry whose lines get their `runningBalance` field
 * filled in immediately and the affected `AccountBalance` rows updated.
 */
export async function postJournalEntryWithRunningBalance(params: {
  userId: string;
  entryNumber: string;
  transactionDate: Date;
  description?: string;
  lines: {
    accountId: string;
    debitAmount?: number | string | Decimal;
    creditAmount?: number | string | Decimal;
    description?: string;
  }[];
}) {
  // Validate double-entry invariant up front.
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);
  for (const l of params.lines) {
    totalDebit = totalDebit.plus(new Decimal(l.debitAmount ?? 0));
    totalCredit = totalCredit.plus(new Decimal(l.creditAmount ?? 0));
  }
  if (!totalDebit.equals(totalCredit)) {
    throw new Error(
      `Journal entry ${params.entryNumber} is unbalanced: D=${totalDebit.toString()} C=${totalCredit.toString()}`,
    );
  }

  // Ensure AccountBalance rows exist for all accounts we'll touch.
  const accountIds = Array.from(new Set(params.lines.map((l) => l.accountId)));
  await prisma.$transaction(
    accountIds.map((accountId) =>
      prisma.accountBalance.upsert({
        where: { accountId },
        update: {},
        create: { accountId, balance: new Decimal(0) },
      }),
    ),
  );

  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const created = await prisma.journalEntry.create({
    data: {
      entryNumber: params.entryNumber,
      transactionDate: params.transactionDate,
      description: params.description,
      status: EntryStatus.posted,
      postedAt: params.transactionDate,
      userId: params.userId,
      lines: {
        create: params.lines.map((l, idx) => ({
          accountId: l.accountId,
          debitAmount: new Decimal(l.debitAmount ?? 0),
          creditAmount: new Decimal(l.creditAmount ?? 0),
          lineNumber: idx + 1,
          description: l.description,
        })),
      },
    },
    include: { lines: { orderBy: { lineNumber: "asc" } } },
  });

  // Now fill runningBalance on the freshly-created lines, then push the
  // aggregate to AccountBalance. AccountBalance already holds the
  // pre-existing balance for each account from the rows we upserted above,
  // but we need the prior value, not 0. Re-read it.
  const priorBalances = await prisma.accountBalance.findMany({
    where: { accountId: { in: accountIds } },
  });
  const balanceMap = new Map(
    priorBalances.map((b) => [b.accountId, new Decimal(b.balance ?? 0)]),
  );

  for (const line of created.lines) {
    const account = accountMap.get(line.accountId);
    if (!account) continue;

    const previous = balanceMap.get(line.accountId) ?? new Decimal(0);
    const debit = new Decimal(line.debitAmount ?? 0);
    const credit = new Decimal(line.creditAmount ?? 0);

    const next = computeRunningBalance(
      previous,
      debit,
      credit,
      account.normalBalance,
    );

    balanceMap.set(line.accountId, next);

    await prisma.journalEntryLine.update({
      where: { id: line.id },
      data: { runningBalance: next },
    });
  }

  for (const [accountId, balance] of balanceMap) {
    await prisma.accountBalance.update({
      where: { accountId },
      data: { balance },
    });
  }

  return created;
}

export async function seedAccounting() {
  console.log("Seeding Accounting Module...");

  // 1. Chart of Accounts
  const accounts = [
    // 1. ASSETS
    {
      code: "10000",
      name: "Assets",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "11000",
      name: "Current Assets",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 1,
      parentCode: "10000",
    },
    {
      code: "11100",
      name: "Cash and Cash Equivalents",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11110",
      name: "Bank - Main",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11120",
      name: "Petty Cash",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11130",
      name: "E-Wallet",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11200",
      name: "Accounts Receivable",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11300",
      name: "Inventory Asset",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11400",
      name: "Purchase Tax Receivable",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11900",
      name: "Uncategorized Asset",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "12000",
      name: "Non-Current Assets",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 1,
      parentCode: "10000",
    },
    {
      code: "12100",
      name: "Fixed Assets",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "12000",
    },
    {
      code: "12200",
      name: "Accumulated Depreciation",
      type: AccountType.asset,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "12000",
    },

    // 2. LIABILITIES
    {
      code: "20000",
      name: "Liabilities",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "21000",
      name: "Current Liabilities",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 1,
      parentCode: "20000",
    },
    {
      code: "21100",
      name: "Accounts Payable",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "21000",
    },
    {
      code: "21200",
      name: "Sales Tax Payable",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "21000",
    },
    {
      code: "21300",
      name: "Payroll Liability",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "21000",
    },
    {
      code: "22000",
      name: "Long-Term Liabilities",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 1,
      parentCode: "20000",
    },

    // 3. EQUITY
    {
      code: "30000",
      name: "Equity",
      type: AccountType.equity,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "31000",
      name: "Capital",
      type: AccountType.equity,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 1,
      parentCode: "30000",
    },
    {
      code: "32000",
      name: "Retained Earnings",
      type: AccountType.equity,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 1,
      parentCode: "30000",
    },
    {
      code: "33000",
      name: "Opening Balance Equity",
      type: AccountType.equity,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 1,
      parentCode: "30000",
    },

    // 4. REVENUE
    {
      code: "40000",
      name: "Revenue",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "41000",
      name: "Operating Revenue",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 1,
      parentCode: "40000",
    },
    {
      code: "41100",
      name: "Service Revenue",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "41000",
    },
    {
      code: "41200",
      name: "Product Sales",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "41000",
    },
    {
      code: "41300",
      name: "Consulting Income",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "41000",
    },
    {
      code: "42000",
      name: "Sales Discount",
      type: AccountType.revenue,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "40000",
    },
    {
      code: "49000",
      name: "Uncategorized Income",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "40000",
    },

    // 5. EXPENSES
    {
      code: "50000",
      name: "Expenses",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "51000",
      name: "Operating Expenses",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 1,
      parentCode: "50000",
    },
    {
      code: "51100",
      name: "Rent Expense",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51200",
      name: "Utilities Expense",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51300",
      name: "Office Supplies",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51400",
      name: "Salaries and Wages",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51500",
      name: "Software Subscriptions",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51600",
      name: "Travel Expense",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51700",
      name: "Marketing",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51800",
      name: "Insurance Expense",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51900",
      name: "Depreciation Expense",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "52000",
      name: "Cost of Goods Sold",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "50000",
    },
    {
      code: "59000",
      name: "Uncategorized Expense",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "50000",
    },
    {
      code: "80000",
      name: "Other Expenses",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "81000",
      name: "Exchange Gain/Loss",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 1,
      parentCode: "80000",
    },
  ];

  for (const acc of accounts) {
    let parentId = null;
    if (acc.parentCode) {
      const parent = await prisma.account.findUnique({
        where: { code: acc.parentCode },
      });
      if (parent) {
        parentId = parent.id;
      }
    }

    await prisma.account.upsert({
      where: { code: acc.code },
      update: {
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        isPosting: acc.isPosting,
        level: acc.level,
        parentId,
      },
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        isPosting: acc.isPosting,
        level: acc.level,
        parentId,
      },
    });
  }

  // 1b. Initialize AccountBalance (one row per account, starting at 0)
  const allAccounts = await prisma.account.findMany({ select: { id: true } });
  for (const acc of allAccounts) {
    await prisma.accountBalance.upsert({
      where: { accountId: acc.id },
      update: {},
      create: {
        accountId: acc.id,
        balance: new Decimal(0),
      },
    });
  }

  // 2. Default Accounts
  const defaultAccounts = [
    { purpose: DefaultAccountPurpose.ACCOUNTS_RECEIVABLE, code: "11200" },
    { purpose: DefaultAccountPurpose.ACCOUNTS_PAYABLE, code: "21100" },
    { purpose: DefaultAccountPurpose.INVENTORY_ASSET, code: "11300" },
    { purpose: DefaultAccountPurpose.COGS, code: "52000" },
    { purpose: DefaultAccountPurpose.SALES_REVENUE, code: "41200" },
    { purpose: DefaultAccountPurpose.SALES_DISCOUNT, code: "42000" },
    { purpose: DefaultAccountPurpose.SALES_TAX_PAYABLE, code: "21200" },
    { purpose: DefaultAccountPurpose.PURCHASE_TAX_RECEIVABLE, code: "11400" },
    { purpose: DefaultAccountPurpose.CASH_ON_HAND, code: "11120" },
    { purpose: DefaultAccountPurpose.BANK, code: "11110" },
    { purpose: DefaultAccountPurpose.OPENING_BALANCE_EQUITY, code: "33000" },
    { purpose: DefaultAccountPurpose.RETAINED_EARNINGS, code: "32000" },
    { purpose: DefaultAccountPurpose.UNCATEGORIZED_EXPENSE, code: "59000" },
    { purpose: DefaultAccountPurpose.UNCATEGORIZED_INCOME, code: "49000" },
    { purpose: DefaultAccountPurpose.UNCATEGORIZED_ASSET, code: "11900" },
    { purpose: DefaultAccountPurpose.EXCHANGE_GAIN_LOSS, code: "81000" },
    { purpose: DefaultAccountPurpose.SALARIES_EXPENSE, code: "51400" },
    { purpose: DefaultAccountPurpose.PAYROLL_LIABILITY, code: "21300" },
  ];

  for (const fa of defaultAccounts) {
    const acc = await prisma.account.findUnique({ where: { code: fa.code } });
    if (acc) {
      // Find existing default account for this purpose
      const existing = await prisma.defaultAccount.findFirst({
        where: { purpose: fa.purpose },
      });

      if (existing) {
        await prisma.defaultAccount.update({
          where: { id: existing.id },
          data: { accountId: acc.id },
        });
      } else {
        await prisma.defaultAccount.create({
          data: {
            purpose: fa.purpose,
            accountId: acc.id,
            isActive: true,
          },
        });
      }
    }
  }

  // 3. Tax Rates
  const taxRates = [
    {
      code: "VAT-S",
      name: "Standard VAT",
      rate: new Decimal(10.0),
      description: "Standard Rate 10%",
    },
    {
      code: "VAT-R",
      name: "Reduced VAT",
      rate: new Decimal(5.0),
      description: "Reduced Rate 5%",
    },
    {
      code: "VAT-Z",
      name: "Zero Rated",
      rate: new Decimal(0.0),
      description: "Zero Rated 0%",
    },
    {
      code: "EXEMPT",
      name: "Exempt",
      rate: new Decimal(0.0),
      description: "Tax Exempt",
    },
  ];

  for (const tax of taxRates) {
    await prisma.taxRate.upsert({
      where: { code: tax.code },
      update: {},
      create: {
        code: tax.code,
        name: tax.name,
        rate: tax.rate,
        description: tax.description,
      },
    });
  }

  // 4. Cash Accounts
  const cashAccountsData = [
    {
      name: "Main Cash Drawer",
      type: CashAccountType.CASH,
      glAccountCode: "11100", // Cash and Cash Equivalents - using parent for now as placeholder or maybe should be specific
      // The original seeder used 11100 for cash drawer but mapped to a specific GL account.
      // Let's use Petty Cash 11120 for actual cash drawer to be more precise or 11100 if general.
      // Re-reading original seeder: "11100" was "Cash and Cash Equivalents". "11120" was "Petty Cash".
      // Let's stick to what worked or map better.
      // Let's map "Main Cash Drawer" to "Petty Cash" account for simplicity if no specific "Main Cash" account exists.
      targetGlCode: "11120",
      description: "Main office cash drawer",
    },
    {
      name: "Main Bank Account",
      type: CashAccountType.BANK,
      glAccountCode: "11110", // Bank - Main
      targetGlCode: "11110",
      accountNumber: "123-456-7890",
      bankName: "First National Bank",
      description: "Primary operating account",
    },
    {
      name: "Office Petty Cash",
      type: CashAccountType.PETTY_CASH,
      targetGlCode: "11120", // Petty Cash
      description: "Small expenses",
    },
    {
      name: "Digital Wallet",
      type: CashAccountType.EWALLET,
      targetGlCode: "11130", // E-Wallet
      bankName: "PayPal",
      accountNumber: "company@example.com",
      description: "Online payments",
    },
  ];

  for (const acc of cashAccountsData) {
    const glAccount = await prisma.account.findUnique({
      where: { code: acc.targetGlCode },
    });

    if (glAccount) {
      await prisma.cashAccount.upsert({
        where: { glAccountId: glAccount.id },
        update: {
          name: acc.name,
          type: acc.type,
          accountNumber: acc.accountNumber,
          bankName: acc.bankName,
          description: acc.description,
        },
        create: {
          name: acc.name,
          type: acc.type,
          accountNumber: acc.accountNumber,
          bankName: acc.bankName,
          description: acc.description,
          glAccountId: glAccount.id,
        },
      });
    }
  }
}

/**
 * Seed a small, deterministic set of posted journal entries that exercise
 * every major accounting flow (capital contribution, cash & credit sales,
 * AR collection, operating expenses, payroll accrual & payment, opening
 * balance equity adjustment). Running balance per line and the aggregate
 * `AccountBalance` rows are kept in sync.
 *
 * Must be called *after* `seedUsers` so the admin user exists.
 */
export async function seedSampleJournalEntries() {
  console.log("Seeding Sample Journal Entries...");

  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@example.com" },
  });
  if (!adminUser) {
    console.log(
      "  Skipping sample JEs: admin user not found (run seedUsers first).",
    );
    return;
  }

  const codeOf = (code: string) =>
    prisma.account.findUnique({ where: { code } });

  const [
    bankAcc,
    cashAcc,
    arAcc,
    apAcc,
    salesAcc,
    serviceAcc,
    rentAcc,
    utilitiesAcc,
    salaryAcc,
    capitalAcc,
    equityOpenAcc,
  ] = await Promise.all([
    codeOf("11110"),
    codeOf("11120"),
    codeOf("11200"),
    codeOf("21100"),
    codeOf("41200"),
    codeOf("41100"),
    codeOf("51100"),
    codeOf("51200"),
    codeOf("51400"),
    codeOf("31000"),
    codeOf("33000"),
  ]);

  if (
    !bankAcc ||
    !capitalAcc ||
    !arAcc ||
    !salesAcc ||
    !rentAcc ||
    !salaryAcc ||
    !cashAcc ||
    !serviceAcc ||
    !utilitiesAcc ||
    !apAcc ||
    !equityOpenAcc
  ) {
    console.log("  Skipping sample JEs: missing one or more core accounts.");
    return;
  }

  const today = new Date();
  const day = (offset: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);

  // 1. Opening capital contribution — Bank +100,000 / Capital +100,000
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-OPEN-0001",
    transactionDate: day(-30),
    description: "Opening capital contribution by owner",
    lines: [
      {
        accountId: bankAcc.id,
        debitAmount: 100000,
        creditAmount: 0,
        description: "Initial bank deposit",
      },
      {
        accountId: capitalAcc.id,
        debitAmount: 0,
        creditAmount: 100000,
        description: "Owner capital",
      },
    ],
  });

  // 2. Cash sale of services — Cash +1,200 / Service Revenue +1,200
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-SVC-0001",
    transactionDate: day(-25),
    description: "Cash service revenue",
    lines: [
      {
        accountId: cashAcc.id,
        debitAmount: 1200,
        creditAmount: 0,
        description: "Cash received for consulting",
      },
      {
        accountId: serviceAcc.id,
        debitAmount: 0,
        creditAmount: 1200,
        description: "Consulting income",
      },
    ],
  });

  // 3. Credit sale — AR +2,400 / Product Sales +2,400
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-SAL-0001",
    transactionDate: day(-20),
    description: "Credit sale to customer",
    lines: [
      {
        accountId: arAcc.id,
        debitAmount: 2400,
        creditAmount: 0,
        description: "Invoice issued",
      },
      {
        accountId: salesAcc.id,
        debitAmount: 0,
        creditAmount: 2400,
        description: "Product sales",
      },
    ],
  });

  // 4. Customer pays on account — Bank +2,400 / AR -2,400
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-REC-0001",
    transactionDate: day(-15),
    description: "Customer payment received",
    lines: [
      {
        accountId: bankAcc.id,
        debitAmount: 2400,
        creditAmount: 0,
        description: "Bank receipt",
      },
      {
        accountId: arAcc.id,
        debitAmount: 0,
        creditAmount: 2400,
        description: "AR cleared",
      },
    ],
  });

  // 5. Pay rent — Rent Expense +2,000 / Bank -2,000
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-EXP-0001",
    transactionDate: day(-10),
    description: "Monthly office rent",
    lines: [
      {
        accountId: rentAcc.id,
        debitAmount: 2000,
        creditAmount: 0,
        description: "Rent expense",
      },
      {
        accountId: bankAcc.id,
        debitAmount: 0,
        creditAmount: 2000,
        description: "Bank payment",
      },
    ],
  });

  // 6. Pay utilities — Utilities +350 / Bank -350
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-EXP-0002",
    transactionDate: day(-8),
    description: "Utility bill payment",
    lines: [
      {
        accountId: utilitiesAcc.id,
        debitAmount: 350,
        creditAmount: 0,
        description: "Utilities expense",
      },
      {
        accountId: bankAcc.id,
        debitAmount: 0,
        creditAmount: 350,
        description: "Bank payment",
      },
    ],
  });

  // 7. Accrue salaries — Salaries +5,000 / AP +5,000
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-EXP-0003",
    transactionDate: day(-5),
    description: "Accrue monthly payroll",
    lines: [
      {
        accountId: salaryAcc.id,
        debitAmount: 5000,
        creditAmount: 0,
        description: "Salaries expense",
      },
      {
        accountId: apAcc.id,
        debitAmount: 0,
        creditAmount: 5000,
        description: "Payroll payable",
      },
    ],
  });

  // 8. Pay salaries — AP -5,000 / Bank -5,000
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-EXP-0004",
    transactionDate: day(-2),
    description: "Pay accrued payroll",
    lines: [
      {
        accountId: apAcc.id,
        debitAmount: 5000,
        creditAmount: 0,
        description: "Clear payroll payable",
      },
      {
        accountId: bankAcc.id,
        debitAmount: 0,
        creditAmount: 5000,
        description: "Bank payment",
      },
    ],
  });

  // 9. Opening balance equity adjustment — Bank +500 / Opening Bal Equity -500
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-ADJ-0001",
    transactionDate: day(-1),
    description: "Opening balance equity adjustment",
    lines: [
      {
        accountId: bankAcc.id,
        debitAmount: 500,
        creditAmount: 0,
        description: "Bank adjustment",
      },
      {
        accountId: equityOpenAcc.id,
        debitAmount: 0,
        creditAmount: 500,
        description: "Opening balance equity",
      },
    ],
  });

  console.log(
    "  ✔ Sample JEs created with running balance and AccountBalance.",
  );
}
