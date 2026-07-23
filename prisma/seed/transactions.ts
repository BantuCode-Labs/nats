import { prisma } from "./utils";

import {
  SalesOrderStatus,
  SalesInvoiceStatus,
  SalesReturnStatus,
  PurchaseOrderStatus,
  PurchaseInvoiceStatus,
  EntryStatus,
  CashTransactionType,
  CashTransactionStatus,
  ProductionOrderStatus,
  SalarySlipStatus,
} from "../generated/prisma/client";
import { Decimal } from "decimal.js";
import {
  faker,
  getRandomItem,
  generateUniqueSKU,
  getRandomDateInLastMonths,
  getWeightedRandomStatus,
  runInChunks,
  randomIdrAmount,
  randomIncomeDescription,
  randomExpenseDescription,
  randomJournalDescription,
  randomReturnReason,
} from "./bulk_utils";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function seedTransactions() {
  console.log("Menyiapkan transaksi awal...");

  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@example.com" },
  });
  if (!adminUser) return;

  // Pelanggan & pemasok (dukung nama baru + legacy)
  const customer =
    (await prisma.contact.findFirst({
      where: { name: "PT Maju Bersama Sejahtera" },
    })) ||
    (await prisma.contact.findFirst({ where: { name: "Acme Corp" } }));

  const vendor =
    (await prisma.contact.findFirst({
      where: { name: "PT Sumber Alat Tulis" },
    })) ||
    (await prisma.contact.findFirst({
      where: { name: "Office Supplies Co" },
    }));

  const productLaptop = await prisma.product.findFirst({
    where: { sku: "ELEC-001" },
  });
  const productChair = await prisma.product.findFirst({
    where: { sku: "FURN-001" },
  });
  const productPaper = await prisma.product.findFirst({
    where: { sku: "SUPP-001" },
  });

  const salesAccount = await prisma.account.findFirst({
    where: { code: "41200" },
  });
  const bankAccount = await prisma.account.findFirst({
    where: { code: "11110" },
  });
  const inventoryAccount = await prisma.account.findFirst({
    where: { code: "11300" },
  });
  const cashAccounts = await prisma.cashAccount.findMany();

  if (
    !customer ||
    !vendor ||
    !productLaptop ||
    !salesAccount ||
    !bankAccount ||
    cashAccounts.length === 0
  ) {
    console.log(
      "Lewati transaksi awal: dependensi belum lengkap.",
    );
    return;
  }

  // Alur penjualan lengkap: SO -> Invoice -> Payment
  // 2 unit Laptop Pro 15 @ Rp 18.500.000
  const soQty = 2;
  const soPrice = new Decimal(productLaptop.price);
  const soTotal = soPrice.mul(soQty);
  const orderDate = addDays(new Date(), -14);

  const salesOrder = await prisma.salesOrder.upsert({
    where: { orderNumber: "SO-2026-001" },
    update: {
      totalAmount: soTotal,
      subtotal: soTotal,
      status: SalesOrderStatus.CONFIRMED,
    },
    create: {
      orderNumber: "SO-2026-001",
      contactId: customer.id,
      orderDate,
      status: SalesOrderStatus.CONFIRMED,
      totalAmount: soTotal,
      subtotal: soTotal,
      createdById: adminUser.id,
      items: {
        create: [
          {
            productId: productLaptop.id,
            quantity: soQty,
            unitPrice: soPrice,
            totalPrice: soTotal,
          },
        ],
      },
    },
  });

  const invoiceDate = addDays(orderDate, 2);
  const invoice = await prisma.salesInvoice.upsert({
    where: { invoiceNumber: "INV-2026-001" },
    update: {
      totalAmount: soTotal,
      subtotal: soTotal,
      balanceDue: new Decimal(0),
      status: SalesInvoiceStatus.PAID,
    },
    create: {
      invoiceNumber: "INV-2026-001",
      contactId: customer.id,
      salesOrderId: salesOrder.id,
      invoiceDate,
      dueDate: addDays(invoiceDate, 30),
      status: SalesInvoiceStatus.PAID,
      totalAmount: soTotal,
      subtotal: soTotal,
      balanceDue: new Decimal(0),
      items: {
        create: [
          {
            description: `Penjualan ${productLaptop.name} sesuai SO-2026-001`,
            productId: productLaptop.id,
            quantity: soQty,
            unitPrice: soPrice,
            totalPrice: soTotal,
            accountId: salesAccount.id,
          },
        ],
      },
    },
  });

  const existingPay = await prisma.salesPayment.findFirst({
    where: { paymentNumber: "PAY-2026-001" },
  });
  if (!existingPay) {
    await prisma.salesPayment.create({
      data: {
        paymentNumber: "PAY-2026-001",
        contactId: customer.id,
        salesInvoiceId: invoice.id,
        paymentDate: addDays(invoiceDate, 5),
        amount: soTotal,
        cashAccountId: getRandomItem(cashAccounts).id,
      },
    });
  }

  // Alur pembelian: PO -> Invoice -> Payment
  if (productPaper && inventoryAccount) {
    const poQty = 100;
    const poCost = new Decimal(productPaper.cost);
    const poTotal = poCost.mul(poQty);
    const poDate = addDays(new Date(), -20);

    const purchaseOrder = await prisma.purchaseOrder.upsert({
      where: { orderNumber: "PO-2026-001" },
      update: {
        totalAmount: poTotal,
        status: PurchaseOrderStatus.CLOSED,
      },
      create: {
        orderNumber: "PO-2026-001",
        contactId: vendor.id,
        orderDate: poDate,
        status: PurchaseOrderStatus.CLOSED,
        totalAmount: poTotal,
        createdById: adminUser.id,
        items: {
          create: [
            {
              productId: productPaper.id,
              quantity: poQty,
              unitCost: poCost,
              totalCost: poTotal,
            },
          ],
        },
      },
    });

    const piDate = addDays(poDate, 3);
    let purchaseInvoice = await prisma.purchaseInvoice.findFirst({
      where: {
        contactId: vendor.id,
        invoiceNumber: "PINV-2026-001",
      },
    });

    if (!purchaseInvoice) {
      purchaseInvoice = await prisma.purchaseInvoice.create({
        data: {
          invoiceNumber: "PINV-2026-001",
          contactId: vendor.id,
          purchaseOrderId: purchaseOrder.id,
          invoiceDate: piDate,
          dueDate: addDays(piDate, 30),
          status: PurchaseInvoiceStatus.PAID,
          totalAmount: poTotal,
          items: {
            create: [
              {
                description: `Tagihan pemasok untuk PO-2026-001 (${productPaper.name})`,
                quantity: poQty,
                unitPrice: poCost,
                totalPrice: poTotal,
                accountId: inventoryAccount.id,
              },
            ],
          },
        },
      });
    } else {
      purchaseInvoice = await prisma.purchaseInvoice.update({
        where: { id: purchaseInvoice.id },
        data: {
          totalAmount: poTotal,
          status: PurchaseInvoiceStatus.PAID,
        },
      });
    }

    const existingPPay = await prisma.purchasePayment.findFirst({
      where: { paymentNumber: "PPAY-2026-001" },
    });
    if (!existingPPay) {
      await prisma.purchasePayment.create({
        data: {
          paymentNumber: "PPAY-2026-001",
          contactId: vendor.id,
          purchaseInvoiceId: purchaseInvoice.id,
          paymentDate: addDays(piDate, 7),
          amount: poTotal,
          cashAccountId: getRandomItem(cashAccounts).id,
        },
      });
    }
  }

  // Pesanan penjualan kedua (belum lunas) — kursi
  if (productChair) {
    const qty = 5;
    const price = new Decimal(productChair.price);
    const total = price.mul(qty);
    const date = addDays(new Date(), -7);

    const so2 = await prisma.salesOrder.upsert({
      where: { orderNumber: "SO-2026-002" },
      update: {
        totalAmount: total,
        subtotal: total,
        status: SalesOrderStatus.SHIPPED,
      },
      create: {
        orderNumber: "SO-2026-002",
        contactId: customer.id,
        orderDate: date,
        status: SalesOrderStatus.SHIPPED,
        totalAmount: total,
        subtotal: total,
        createdById: adminUser.id,
        items: {
          create: [
            {
              productId: productChair.id,
              quantity: qty,
              unitPrice: price,
              totalPrice: total,
            },
          ],
        },
      },
    });

    await prisma.salesInvoice.upsert({
      where: { invoiceNumber: "INV-2026-002" },
      update: {
        totalAmount: total,
        subtotal: total,
        balanceDue: total,
        status: SalesInvoiceStatus.ISSUED,
      },
      create: {
        invoiceNumber: "INV-2026-002",
        contactId: customer.id,
        salesOrderId: so2.id,
        invoiceDate: addDays(date, 1),
        dueDate: addDays(date, 31),
        status: SalesInvoiceStatus.ISSUED,
        totalAmount: total,
        subtotal: total,
        balanceDue: total,
        items: {
          create: [
            {
              description: `Penjualan ${productChair.name} sesuai SO-2026-002`,
              productId: productChair.id,
              quantity: qty,
              unitPrice: price,
              totalPrice: total,
              accountId: salesAccount.id,
            },
          ],
        },
      },
    });
  }

  console.log("  ✔ Transaksi awal siap (SO/INV/PO dengan alur bisnis IDR).");
}

export async function seedBulkTransactions(count: number) {
  console.log(`🚀 Memulai seeding massal transaksi (target: >500 per tabel)...`);

  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@example.com" },
  });
  const customers = await prisma.contact.findMany({
    where: { type: "CUSTOMER" },
  });
  const vendors = await prisma.contact.findMany({ where: { type: "VENDOR" } });
  const products = await prisma.product.findMany();
  const accounts = await prisma.account.findMany();
  const cashAccounts = await prisma.cashAccount.findMany();

  if (
    !adminUser ||
    customers.length === 0 ||
    vendors.length === 0 ||
    products.length === 0 ||
    accounts.length === 0 ||
    cashAccounts.length === 0
  ) {
    console.warn(
      "⚠️ Dependensi transaksi massal belum lengkap. Dilewati.",
    );
    return;
  }

  const salesAccount = accounts.find((a) => a.code === "41200") || accounts[0];
  const bankAccount = accounts.find((a) => a.code === "11110") || accounts[0];
  const inventoryAccount =
    accounts.find((a) => a.code === "11300") || accounts[0];
  const expenseAccount =
    accounts.find((a) => a.code === "59000") ||
    accounts.find((a) => a.code === "51300") ||
    accounts[0];
  const rentAccount = accounts.find((a) => a.code === "51100") || expenseAccount;
  const utilitiesAccount =
    accounts.find((a) => a.code === "51200") || expenseAccount;
  const marketingAccount =
    accounts.find((a) => a.code === "51700") || expenseAccount;

  // 1. PENJUALAN: SO -> Faktur -> Pembayaran
  console.log("--- Modul Penjualan ---");
  const salesOrdersCount = Math.floor(count * 0.8);
  const salesOrders = [];
  for (let i = 0; i < salesOrdersCount; i++) {
    const customer = getRandomItem(customers);
    const product = getRandomItem(products);
    const qty = faker.number.int({ min: 1, max: 20 });
    const date = getRandomDateInLastMonths(6);
    const price = product.price;
    const total = price.mul(qty);

    salesOrders.push({
      orderNumber: generateUniqueSKU("SO-B", i),
      contactId: customer.id,
      orderDate: date,
      status: getWeightedRandomStatus(
        [
          SalesOrderStatus.CONFIRMED,
          SalesOrderStatus.SHIPPED,
          SalesOrderStatus.CLOSED,
          SalesOrderStatus.CANCELLED,
        ],
        [40, 30, 20, 10],
      ),
      totalAmount: total,
      subtotal: total,
      createdById: adminUser.id,
      productId: product.id,
      productName: product.name,
      qty,
      price,
    });
  }

  await runInChunks(salesOrders, 100, async (chunk) => {
    for (const so of chunk) {
      const createdSO = await prisma.salesOrder.create({
        data: {
          orderNumber: so.orderNumber,
          contactId: so.contactId,
          orderDate: so.orderDate,
          status: so.status,
          totalAmount: so.totalAmount,
          subtotal: so.subtotal,
          createdById: so.createdById,
          items: {
            create: [
              {
                productId: so.productId,
                quantity: so.qty,
                unitPrice: so.price,
                totalPrice: so.totalAmount,
              },
            ],
          },
        },
      });

      if (so.status !== SalesOrderStatus.CANCELLED && Math.random() > 0.1) {
        const invStatus = getWeightedRandomStatus(
          [
            SalesInvoiceStatus.ISSUED,
            SalesInvoiceStatus.PAID,
            SalesInvoiceStatus.PARTIALLY_PAID,
          ],
          [20, 70, 10],
        );
        const invDate = addDays(
          so.orderDate,
          faker.number.int({ min: 1, max: 5 }),
        );
        const paidAmount =
          invStatus === SalesInvoiceStatus.PAID
            ? so.totalAmount
            : invStatus === SalesInvoiceStatus.PARTIALLY_PAID
              ? so.totalAmount.mul(0.5)
              : new Decimal(0);
        const balanceDue = so.totalAmount.minus(paidAmount);

        const createdInv = await prisma.salesInvoice.create({
          data: {
            invoiceNumber: createdSO.orderNumber.replace("SO", "INV"),
            contactId: so.contactId,
            salesOrderId: createdSO.id,
            invoiceDate: invDate,
            dueDate: addDays(invDate, 30),
            status: invStatus,
            totalAmount: so.totalAmount,
            subtotal: so.totalAmount,
            balanceDue,
            items: {
              create: [
                {
                  description: `Faktur penjualan ${so.productName} (${so.orderNumber})`,
                  productId: so.productId,
                  quantity: so.qty,
                  unitPrice: so.price,
                  totalPrice: so.totalAmount,
                  accountId: salesAccount.id,
                },
              ],
            },
          },
        });

        if (
          (invStatus === SalesInvoiceStatus.PAID ||
            invStatus === SalesInvoiceStatus.PARTIALLY_PAID) &&
          Math.random() > 0.1
        ) {
          await prisma.salesPayment.create({
            data: {
              paymentNumber: createdInv.invoiceNumber.replace("INV", "PAY"),
              contactId: so.contactId,
              salesInvoiceId: createdInv.id,
              paymentDate: addDays(
                invDate,
                faker.number.int({ min: 1, max: 10 }),
              ),
              amount:
                invStatus === SalesInvoiceStatus.PAID
                  ? so.totalAmount
                  : paidAmount,
              cashAccountId: getRandomItem(cashAccounts).id,
            },
          });
        }
      }
    }
  });

  // 2. PEMBELIAN: PO -> Faktur -> Pembayaran
  console.log("--- Modul Pembelian ---");
  const purchaseOrdersCount = Math.floor(count * 0.8);
  const purchaseOrders = [];
  for (let i = 0; i < purchaseOrdersCount; i++) {
    const vendor = getRandomItem(vendors);
    const product = getRandomItem(products);
    const qty = faker.number.int({ min: 10, max: 100 });
    const date = getRandomDateInLastMonths(6);
    const cost = product.cost;
    const total = cost.mul(qty);

    purchaseOrders.push({
      orderNumber: generateUniqueSKU("PO-B", i),
      contactId: vendor.id,
      orderDate: date,
      status: getWeightedRandomStatus(
        [
          PurchaseOrderStatus.ISSUED,
          PurchaseOrderStatus.CLOSED,
          PurchaseOrderStatus.DRAFT,
        ],
        [50, 40, 10],
      ),
      totalAmount: total,
      createdById: adminUser.id,
      productId: product.id,
      productName: product.name,
      qty,
      cost,
    });
  }

  await runInChunks(purchaseOrders, 100, async (chunk) => {
    for (const po of chunk) {
      const createdPO = await prisma.purchaseOrder.create({
        data: {
          orderNumber: po.orderNumber,
          contactId: po.contactId,
          orderDate: po.orderDate,
          status: po.status,
          totalAmount: po.totalAmount,
          createdById: po.createdById,
          items: {
            create: [
              {
                productId: po.productId,
                quantity: po.qty,
                unitCost: po.cost,
                totalCost: po.totalAmount,
              },
            ],
          },
        },
      });

      if (po.status !== PurchaseOrderStatus.DRAFT && Math.random() > 0.1) {
        const piStatus = getWeightedRandomStatus(
          [PurchaseInvoiceStatus.BILLED, PurchaseInvoiceStatus.PAID],
          [30, 70],
        );
        const piDate = addDays(
          po.orderDate,
          faker.number.int({ min: 1, max: 7 }),
        );

        const createdPI = await prisma.purchaseInvoice.create({
          data: {
            invoiceNumber: createdPO.orderNumber.replace("PO", "PINV"),
            contactId: po.contactId,
            purchaseOrderId: createdPO.id,
            invoiceDate: piDate,
            dueDate: addDays(piDate, 30),
            status: piStatus,
            totalAmount: po.totalAmount,
            items: {
              create: [
                {
                  description: `Tagihan pemasok ${po.productName} (${po.orderNumber})`,
                  quantity: po.qty,
                  unitPrice: po.cost,
                  totalPrice: po.totalAmount,
                  accountId: inventoryAccount.id,
                },
              ],
            },
          },
        });

        if (piStatus === PurchaseInvoiceStatus.PAID && Math.random() > 0.1) {
          await prisma.purchasePayment.create({
            data: {
              paymentNumber: createdPI.invoiceNumber.replace("PINV", "PPAY"),
              contactId: po.contactId,
              purchaseInvoiceId: createdPI.id,
              paymentDate: addDays(
                piDate,
                faker.number.int({ min: 1, max: 5 }),
              ),
              amount: po.totalAmount,
              cashAccountId: getRandomItem(cashAccounts).id,
            },
          });
        }
      }
    }
  });

  // 3. AKUNTANSI & KAS
  console.log("--- Modul Akuntansi & Kas ---");
  const journalsCount = Math.floor(count * 0.6);
  const journals = [];
  for (let i = 0; i < journalsCount; i++) {
    const amount = new Decimal(randomIdrAmount(100_000, 50_000_000));
    journals.push({
      entryNumber: generateUniqueSKU("JE-B", i),
      date: getRandomDateInLastMonths(6),
      description: randomJournalDescription(),
      amount,
    });
  }

  await runInChunks(journals, 100, async (chunk) => {
    for (const je of chunk) {
      await prisma.journalEntry.create({
        data: {
          entryNumber: je.entryNumber,
          transactionDate: je.date,
          description: je.description,
          status: EntryStatus.posted,
          postedAt: je.date,
          userId: adminUser.id,
          lines: {
            create: [
              {
                accountId: bankAccount.id,
                debitAmount: je.amount,
                creditAmount: 0,
                lineNumber: 1,
                description: "Debit kas/bank",
              },
              {
                accountId: salesAccount.id,
                debitAmount: 0,
                creditAmount: je.amount,
                lineNumber: 2,
                description: "Kredit pendapatan",
              },
            ],
          },
        },
      });
    }
  });

  const expenseAccounts = [
    rentAccount,
    utilitiesAccount,
    marketingAccount,
    expenseAccount,
  ];
  const cashTxCount = Math.floor(count * 0.6);
  const cashTx = [];
  for (let i = 0; i < cashTxCount; i++) {
    const type = getWeightedRandomStatus(
      [CashTransactionType.INCOME, CashTransactionType.EXPENSE],
      [30, 70],
    );
    const amount = new Decimal(
      type === CashTransactionType.INCOME
        ? randomIdrAmount(100_000, 25_000_000)
        : randomIdrAmount(50_000, 15_000_000),
    );
    cashTx.push({
      date: getRandomDateInLastMonths(6),
      type,
      amount,
      description:
        type === CashTransactionType.INCOME
          ? randomIncomeDescription()
          : randomExpenseDescription(),
      counterAccountId:
        type === CashTransactionType.INCOME
          ? salesAccount.id
          : getRandomItem(expenseAccounts).id,
    });
  }

  await runInChunks(cashTx, 100, async (chunk) => {
    for (const tx of chunk) {
      const jeCount = await prisma.journalEntry.count();
      const je = await prisma.journalEntry.create({
        data: {
          entryNumber: generateUniqueSKU("TXJE", jeCount + 1),
          transactionDate: tx.date,
          description: tx.description,
          status: EntryStatus.posted,
          postedAt: tx.date,
          userId: adminUser.id,
          lines: {
            create: [
              {
                accountId: bankAccount.id,
                debitAmount:
                  tx.type === CashTransactionType.INCOME ? tx.amount : 0,
                creditAmount:
                  tx.type === CashTransactionType.EXPENSE ? tx.amount : 0,
                lineNumber: 1,
              },
              {
                accountId: tx.counterAccountId,
                debitAmount:
                  tx.type === CashTransactionType.EXPENSE ? tx.amount : 0,
                creditAmount:
                  tx.type === CashTransactionType.INCOME ? tx.amount : 0,
                lineNumber: 2,
              },
            ],
          },
        },
      });

      await prisma.cashTransaction.create({
        data: {
          cashAccountId: getRandomItem(cashAccounts).id,
          type: tx.type,
          date: tx.date,
          description: tx.description,
          journalEntryId: je.id,
          status: CashTransactionStatus.APPROVED,
          allocations: {
            create: [
              {
                accountId: tx.counterAccountId,
                amount: tx.amount,
                description: tx.description,
              },
            ],
          },
        },
      });
    }
  });

  // 4. PRODUKSI
  console.log("--- Modul Produksi ---");
  const productionOrdersCount = Math.floor(count * 0.6);
  const productionOrders = [];
  for (let i = 0; i < productionOrdersCount; i++) {
    const product = getRandomItem(products);
    productionOrders.push({
      orderNumber: generateUniqueSKU("MO-B", i),
      productId: product.id,
      date: getRandomDateInLastMonths(6),
      qty: faker.number.int({ min: 5, max: 100 }),
    });
  }

  await runInChunks(productionOrders, 100, async (chunk) => {
    for (const mo of chunk) {
      await prisma.productionOrder.create({
        data: {
          orderNumber: mo.orderNumber,
          productId: mo.productId,
          plannedQuantity: mo.qty,
          producedQuantity: Math.random() > 0.4 ? mo.qty : 0,
          status: getWeightedRandomStatus(
            [
              ProductionOrderStatus.COMPLETED,
              ProductionOrderStatus.IN_PROGRESS,
              ProductionOrderStatus.RELEASED,
            ],
            [50, 30, 20],
          ),
          startDate: mo.date,
          endDate: addDays(mo.date, 2),
        },
      });
    }
  });

  // 5. RETUR PENJUALAN
  console.log("--- Retur Penjualan ---");
  const salesInvoices = await prisma.salesInvoice.findMany({
    take: 200,
    where: { status: SalesInvoiceStatus.PAID },
  });
  const returnsCount = Math.floor(count * 0.4);
  const salesReturns = [];
  for (let i = 0; i < returnsCount; i++) {
    const inv = getRandomItem(salesInvoices);
    if (!inv) continue;
    const date = addDays(inv.invoiceDate, faker.number.int({ min: 5, max: 20 }));
    salesReturns.push({
      returnNumber: generateUniqueSKU("SR-B", i),
      contactId: inv.contactId,
      salesInvoiceId: inv.id,
      date,
      amount: inv.totalAmount.mul(0.5),
    });
  }

  await runInChunks(salesReturns, 100, async (chunk) => {
    for (const sr of chunk) {
      await prisma.salesReturn.create({
        data: {
          returnNumber: sr.returnNumber,
          contactId: sr.contactId,
          salesInvoiceId: sr.salesInvoiceId,
          returnDate: sr.date,
          totalAmount: sr.amount,
          status: SalesReturnStatus.COMPLETED,
          reason: randomReturnReason(),
        },
      });
    }
  });

  // 6. PAYROLL (Slip Gaji)
  console.log("--- Modul Penggajian ---");
  const employees = await prisma.contact.findMany({
    where: { type: "EMPLOYEE" },
    take: 100,
  });
  const periods = await prisma.payrollPeriod.findMany();

  if (employees.length > 0 && periods.length > 0) {
    const salarySlips = [];
    const slipCount = Math.min(600, employees.length * periods.length * 2);
    for (let i = 0; i < slipCount; i++) {
      const emp = getRandomItem(employees);
      const period = getRandomItem(periods);
      const gross = randomIdrAmount(4_500_000, 25_000_000);
      const deductions = Math.round(gross * 0.08);
      const net = gross - deductions;
      salarySlips.push({
        contactId: emp.id,
        periodId: period.id,
        gross: new Decimal(gross),
        deductions: new Decimal(deductions),
        net: new Decimal(net),
      });
    }

    await runInChunks(salarySlips, 100, async (chunk) => {
      for (const slip of chunk) {
        await prisma.salarySlip.create({
          data: {
            contactId: slip.contactId,
            periodId: slip.periodId,
            grossSalary: slip.gross,
            totalDeductions: slip.deductions,
            netSalary: slip.net,
            status: SalarySlipStatus.PAID,
            paidAt: getRandomDateInLastMonths(3),
          },
        });
      }
    });
  } else {
    console.warn("  Karyawan/periode penggajian belum ada. Slip gaji dilewati.");
  }

  console.log("✅ Seeding massal transaksi selesai.");
}
