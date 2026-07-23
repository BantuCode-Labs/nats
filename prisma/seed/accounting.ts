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
  console.log("Menyelaraskan running balance jurnal & AccountBalance...");

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
    `  ✔ Diselaraskan ${entries.length} jurnal pada ${running.size} akun.`,
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
  // Idempotent: skip if entryNumber already exists (re-run seed aman)
  const existing = await prisma.journalEntry.findUnique({
    where: { entryNumber: params.entryNumber },
    select: { id: true },
  });
  if (existing) {
    return existing;
  }

  // Validasi double-entry di awal.
  let totalDebit = new Decimal(0);
  let totalCredit = new Decimal(0);
  for (const l of params.lines) {
    totalDebit = totalDebit.plus(new Decimal(l.debitAmount ?? 0));
    totalCredit = totalCredit.plus(new Decimal(l.creditAmount ?? 0));
  }
  if (!totalDebit.equals(totalCredit)) {
    throw new Error(
      `Jurnal ${params.entryNumber} tidak seimbang: D=${totalDebit.toString()} C=${totalCredit.toString()}`,
    );
  }

  // Pastikan baris AccountBalance ada untuk semua akun yang disentuh.
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

  // Isi runningBalance baris baru, lalu update agregat AccountBalance.
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
  console.log("Menyiapkan modul akuntansi...");

  // 1. Chart of Accounts
  const accounts = [
    // 1. ASET
    {
      code: "10000",
      name: "Aset",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "11000",
      name: "Aset Lancar",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 1,
      parentCode: "10000",
    },
    {
      code: "11100",
      name: "Kas dan Setara Kas",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11110",
      name: "Bank Operasional",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11120",
      name: "Kas Kecil",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11130",
      name: "Dompet Digital",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11200",
      name: "Piutang Usaha",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11300",
      name: "Persediaan",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11400",
      name: "PPN Masukan",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11900",
      name: "Aset Belum Dikategorikan",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "12000",
      name: "Aset Tidak Lancar",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 1,
      parentCode: "10000",
    },
    {
      code: "12100",
      name: "Aset Tetap",
      type: AccountType.asset,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "12000",
    },
    {
      code: "12200",
      name: "Akumulasi Penyusutan",
      type: AccountType.asset,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "12000",
    },

    // 2. LIABILITAS
    {
      code: "20000",
      name: "Liabilitas",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "21000",
      name: "Liabilitas Jangka Pendek",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 1,
      parentCode: "20000",
    },
    {
      code: "21100",
      name: "Utang Usaha",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "21000",
    },
    {
      code: "21200",
      name: "PPN Keluaran",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "21000",
    },
    {
      code: "21300",
      name: "Utang Gaji",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "21000",
    },
    {
      code: "22000",
      name: "Liabilitas Jangka Panjang",
      type: AccountType.liability,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 1,
      parentCode: "20000",
    },

    // 3. EKUITAS
    {
      code: "30000",
      name: "Ekuitas",
      type: AccountType.equity,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "31000",
      name: "Modal",
      type: AccountType.equity,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 1,
      parentCode: "30000",
    },
    {
      code: "32000",
      name: "Laba Ditahan",
      type: AccountType.equity,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 1,
      parentCode: "30000",
    },
    {
      code: "33000",
      name: "Ekuitas Saldo Awal",
      type: AccountType.equity,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 1,
      parentCode: "30000",
    },

    // 4. PENDAPATAN
    {
      code: "40000",
      name: "Pendapatan",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "41000",
      name: "Pendapatan Operasional",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: false,
      level: 1,
      parentCode: "40000",
    },
    {
      code: "41100",
      name: "Pendapatan Jasa",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "41000",
    },
    {
      code: "41200",
      name: "Penjualan Produk",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "41000",
    },
    {
      code: "41300",
      name: "Pendapatan Konsultasi",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "41000",
    },
    {
      code: "42000",
      name: "Potongan Penjualan",
      type: AccountType.revenue,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "40000",
    },
    {
      code: "49000",
      name: "Pendapatan Lain-lain",
      type: AccountType.revenue,
      normalBalance: NormalBalance.credit,
      isPosting: true,
      level: 2,
      parentCode: "40000",
    },

    // 5. EXPENSES
    {
      code: "50000",
      name: "Beban",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "51000",
      name: "Beban Operasional",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 1,
      parentCode: "50000",
    },
    {
      code: "51100",
      name: "Beban Sewa",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51200",
      name: "Beban Utilitas",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51300",
      name: "Beban ATK",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51400",
      name: "Beban Gaji dan Upah",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51500",
      name: "Beban Langganan Perangkat Lunak",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51600",
      name: "Beban Perjalanan Dinas",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51700",
      name: "Beban Pemasaran",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51800",
      name: "Beban Asuransi",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51900",
      name: "Beban Penyusutan",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "52000",
      name: "Harga Pokok Penjualan",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "50000",
    },
    {
      code: "59000",
      name: "Beban Belum Dikategorikan",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: true,
      level: 2,
      parentCode: "50000",
    },
    {
      code: "80000",
      name: "Beban Lain-lain",
      type: AccountType.expense,
      normalBalance: NormalBalance.debit,
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "81000",
      name: "Laba/Rugi Selisih Kurs",
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

  // 3. Tarif Pajak
  const taxRates = [
    {
      code: "PPN-11",
      name: "PPN 11%",
      rate: new Decimal(11.0),
      description: "Pajak Pertambahan Nilai 11%",
    },
    {
      code: "PPN-12",
      name: "PPN 12%",
      rate: new Decimal(12.0),
      description: "Pajak Pertambahan Nilai 12%",
    },
    {
      code: "PPN-0",
      name: "PPN 0%",
      rate: new Decimal(0.0),
      description: "PPN tarif 0%",
    },
    {
      code: "BEBAS",
      name: "Bebas PPN",
      rate: new Decimal(0.0),
      description: "Dibebaskan dari PPN",
    },
    {
      code: "VAT-S",
      name: "PPN 11% (legacy)",
      rate: new Decimal(11.0),
      description: "Alias legacy Standard VAT → PPN 11%",
    },
    {
      code: "VAT-R",
      name: "PPN 12% (legacy)",
      rate: new Decimal(12.0),
      description: "Alias legacy Reduced VAT → PPN 12%",
    },
    {
      code: "VAT-Z",
      name: "PPN 0% (legacy)",
      rate: new Decimal(0.0),
      description: "Alias legacy Zero Rated",
    },
    {
      code: "EXEMPT",
      name: "Bebas PPN (legacy)",
      rate: new Decimal(0.0),
      description: "Alias legacy Tax Exempt",
    },
  ];

  for (const tax of taxRates) {
    await prisma.taxRate.upsert({
      where: { code: tax.code },
      update: {
        name: tax.name,
        rate: tax.rate,
        description: tax.description,
      },
      create: {
        code: tax.code,
        name: tax.name,
        rate: tax.rate,
        description: tax.description,
      },
    });
  }

  // 4. Rekening Kas/Bank
  // Setiap rekening kas/bank memetakan ke GL unik (glAccountId @unique)
  const cashAccountsData = [
    {
      name: "Kas Utama Kantor",
      type: CashAccountType.CASH,
      targetGlCode: "11100",
      description: "Kas harian operasional kantor",
    },
    {
      name: "Rekening BCA Operasional",
      type: CashAccountType.BANK,
      targetGlCode: "11110",
      accountNumber: "1234567890",
      bankName: "Bank Central Asia",
      description: "Rekening operasional utama",
    },
    {
      name: "Kas Kecil Kantor",
      type: CashAccountType.PETTY_CASH,
      targetGlCode: "11120",
      description: "Pengeluaran kecil harian",
    },
    {
      name: "Dompet Digital",
      type: CashAccountType.EWALLET,
      targetGlCode: "11130",
      bankName: "GoPay",
      accountNumber: "081234567890",
      description: "Penerimaan pembayaran digital",
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
  console.log("Menyiapkan contoh jurnal transaksi...");

  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@example.com" },
  });
  if (!adminUser) {
    console.log(
      "  Lewati contoh jurnal: pengguna admin tidak ditemukan (jalankan seedUsers dulu).",
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
    console.log("  Lewati contoh jurnal: beberapa akun inti tidak ditemukan.");
    return;
  }

  const today = new Date();
  const day = (offset: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);

  // 1. Setoran modal awal — Bank +500jt / Modal +500jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-OPEN-0001",
    transactionDate: day(-30),
    description: "Setoran modal awal pemilik",
    lines: [
      {
        accountId: bankAcc.id,
        debitAmount: 500_000_000,
        creditAmount: 0,
        description: "Setoran awal ke rekening bank",
      },
      {
        accountId: capitalAcc.id,
        debitAmount: 0,
        creditAmount: 500_000_000,
        description: "Modal pemilik",
      },
    ],
  });

  // 2. Penjualan jasa tunai — Kas +2,5jt / Pendapatan Jasa +2,5jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-SVC-0001",
    transactionDate: day(-25),
    description: "Pendapatan jasa tunai",
    lines: [
      {
        accountId: cashAcc.id,
        debitAmount: 2_500_000,
        creditAmount: 0,
        description: "Penerimaan tunai jasa konsultasi",
      },
      {
        accountId: serviceAcc.id,
        debitAmount: 0,
        creditAmount: 2_500_000,
        description: "Pendapatan konsultasi",
      },
    ],
  });

  // 3. Penjualan kredit — Piutang +18,5jt / Penjualan Produk +18,5jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-SAL-0001",
    transactionDate: day(-20),
    description: "Penjualan kredit ke pelanggan",
    lines: [
      {
        accountId: arAcc.id,
        debitAmount: 18_500_000,
        creditAmount: 0,
        description: "Faktur penjualan diterbitkan",
      },
      {
        accountId: salesAcc.id,
        debitAmount: 0,
        creditAmount: 18_500_000,
        description: "Penjualan produk",
      },
    ],
  });

  // 4. Pelunasan piutang — Bank +18,5jt / Piutang -18,5jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-REC-0001",
    transactionDate: day(-15),
    description: "Penerimaan pelunasan piutang pelanggan",
    lines: [
      {
        accountId: bankAcc.id,
        debitAmount: 18_500_000,
        creditAmount: 0,
        description: "Penerimaan transfer bank",
      },
      {
        accountId: arAcc.id,
        debitAmount: 0,
        creditAmount: 18_500_000,
        description: "Pelunasan piutang usaha",
      },
    ],
  });

  // 5. Pembayaran sewa kantor — Beban Sewa +25jt / Bank -25jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-EXP-0001",
    transactionDate: day(-10),
    description: "Sewa kantor bulanan",
    lines: [
      {
        accountId: rentAcc.id,
        debitAmount: 25_000_000,
        creditAmount: 0,
        description: "Beban sewa",
      },
      {
        accountId: bankAcc.id,
        debitAmount: 0,
        creditAmount: 25_000_000,
        description: "Pembayaran via bank",
      },
    ],
  });

  // 6. Pembayaran utilitas — Beban Utilitas +3,5jt / Bank -3,5jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-EXP-0002",
    transactionDate: day(-8),
    description: "Pembayaran tagihan utilitas",
    lines: [
      {
        accountId: utilitiesAcc.id,
        debitAmount: 3_500_000,
        creditAmount: 0,
        description: "Beban listrik dan air",
      },
      {
        accountId: bankAcc.id,
        debitAmount: 0,
        creditAmount: 3_500_000,
        description: "Pembayaran via bank",
      },
    ],
  });

  // 7. Akrual gaji — Beban Gaji +45jt / Utang +45jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-EXP-0003",
    transactionDate: day(-5),
    description: "Akrual gaji karyawan bulanan",
    lines: [
      {
        accountId: salaryAcc.id,
        debitAmount: 45_000_000,
        creditAmount: 0,
        description: "Beban gaji",
      },
      {
        accountId: apAcc.id,
        debitAmount: 0,
        creditAmount: 45_000_000,
        description: "Utang gaji",
      },
    ],
  });

  // 8. Pembayaran gaji — Utang -45jt / Bank -45jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-EXP-0004",
    transactionDate: day(-2),
    description: "Pembayaran gaji terutang",
    lines: [
      {
        accountId: apAcc.id,
        debitAmount: 45_000_000,
        creditAmount: 0,
        description: "Pelunasan utang gaji",
      },
      {
        accountId: bankAcc.id,
        debitAmount: 0,
        creditAmount: 45_000_000,
        description: "Pembayaran via bank",
      },
    ],
  });

  // 9. Penyesuaian ekuitas saldo awal — Bank +1,5jt / Ekuitas Saldo Awal +1,5jt
  await postJournalEntryWithRunningBalance({
    userId: adminUser.id,
    entryNumber: "JE-ADJ-0001",
    transactionDate: day(-1),
    description: "Penyesuaian ekuitas saldo awal",
    lines: [
      {
        accountId: bankAcc.id,
        debitAmount: 1_500_000,
        creditAmount: 0,
        description: "Penyesuaian saldo bank",
      },
      {
        accountId: equityOpenAcc.id,
        debitAmount: 0,
        creditAmount: 1_500_000,
        description: "Ekuitas saldo awal",
      },
    ],
  });

  console.log(
    "  ✔ Contoh jurnal dibuat dengan running balance dan AccountBalance.",
  );
}
