"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { SuperJSON } from "@/lib/superjson";
import type { ActionResponse } from "@/types/actions";
import { POSTransactionService } from "@/modules/pos/services/pos-transaction.service";
import { POSSessionService } from "@/modules/pos/services/pos-session.service";
import { HeldOrderService } from "@/modules/pos/services/held-order.service";
import { POSCartItem } from "./types";

export async function getPOSSessions() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const sessions = await prisma.pOSSession.findMany({
    orderBy: { startTime: "desc" },
    include: {
      warehouse: {
        select: {
          name: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      _count: {
        select: {
          salesOrders: true,
        },
      },
    },
  });

  const sessionsWithCashier = await Promise.all(
    sessions.map(async (s: any) => {
      const cashier = await prisma.user.findUnique({
        where: { id: s.cashierId },
        select: { name: true },
      });
      return {
        ...s,
        cashier,
      };
    }),
  );

  return SuperJSON.serialize(sessionsWithCashier);
}

export async function getPOSProducts(
  page: number = 1,
  pageSize: number = 20,
  query?: string,
  categoryId?: string,
) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize({
      items: [],
      total: 0,
      hasMore: false,
    });
  }

  // Resolve the active POS session's warehouse so stock reflects only that location.
  const activePosSession = await prisma.pOSSession.findFirst({
    where: {
      status: "OPEN",
      cashierId: session.userId,
    },
    select: { warehouseId: true },
  });

  const where: any = {
    isActive: true,
  };

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
    ];
  }

  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId;
  }

  const now = new Date();

  const inventoryWhere = activePosSession?.warehouseId
    ? { warehouseId: activePosSession.warehouseId }
    : undefined;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: {
          where: inventoryWhere,
          include: {
            warehouse: true,
          },
        },
        discounts: {
          where: {
            isActive: true,
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const mapped = products.map((p) => {
    const totalStock = p.inventory.reduce((acc, inv) => acc + inv.quantity, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price.toNumber(),
      image: p.image,
      categoryId: p.categoryId,
      categoryName: p.category?.name || null,
      stock: totalStock,
      availableDiscounts: p.discounts.map((d) => ({
        code: d.code,
        type: d.type,
        value: d.value.toNumber(),
      })),
    };
  });

  return SuperJSON.serialize({
    items: mapped,
    total,
    hasMore: page * pageSize < total,
  });
}

export async function getPOSCategories() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return SuperJSON.serialize(categories);
}

export async function getWarehouses() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: "asc" },
  });
  return SuperJSON.serialize(warehouses);
}

/**
 * Returns the list of active Department tags that can be assigned to a POS
 * session. Mirrors the existing `getDepartments` action from the general
 * module but scoped to the `pos.access` permission so the POS UI can fetch
 * both warehouses and departments in one place.
 */
export async function getPOSDepartments() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "pos.access")) {
    return SuperJSON.serialize([]);
  }

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
  return SuperJSON.serialize(departments);
}

export async function getOpenPOSSession() {
  const session = await getSession();
  const userId = session?.userId;

  if (!userId || !hasPermission(session.permissions, "pos.access")) return null;

  const posSession = await prisma.pOSSession.findFirst({
    where: {
      status: "OPEN",
      cashierId: userId,
    },
    include: {
      warehouse: true,
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (!posSession) return null;

  const cashier = await prisma.user.findUnique({
    where: { id: posSession.cashierId },
    select: { name: true },
  });

  return SuperJSON.serialize({
    ...posSession,
    cashier,
  });
}

export async function openPOSSession(
  openingCash: number,
  warehouseId: string,
  departmentId?: string | null,
) {
  const session = await getSession();
  const userId = session?.userId;
  if (!userId || !hasPermission(session.permissions, "pos.access"))
    throw new Error("Unauthorized");

  const newSession = await POSSessionService.open(
    userId,
    openingCash,
    warehouseId,
    departmentId,
  );

  revalidatePath("/pos");
  return SuperJSON.serialize(newSession);
}

export async function closePOSSession(
  sessionId: string,
  actualCash: number,
  notes?: string,
) {
  const sessionUser = await getSession();
  if (!sessionUser || !hasPermission(sessionUser.permissions, "pos.access")) {
    throw new Error("Unauthorized");
  }

  await POSSessionService.close(sessionId, actualCash, notes);

  revalidatePath("/pos");
}

export async function getPOSSessionTransactions(sessionId: string) {
  const transactions = await prisma.salesInvoice.findMany({
    where: { posSessionId: sessionId },
    orderBy: { createdAt: "desc" },
    include: {
      contact: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
      posSession: true,
    },
  });

  const transactionsWithCashier = await Promise.all(
    transactions.map(async (t: any) => {
      const cashier = await prisma.user.findUnique({
        where: { id: t.posSession?.cashierId },
        select: { name: true },
      });
      return {
        ...t,
        posSession: {
          ...t.posSession,
          cashier,
        },
      };
    }),
  );

  return SuperJSON.serialize(transactionsWithCashier);
}

export async function processPOSTransaction(
  sessionId: string,
  items: {
    productId: string;
    quantity: number;
    price: number;
    discount: number;
  }[],
  paymentMethod: "CASH" | "CARD" | "QRIS",
  amountPaid: number,
  globalDiscount: number = 0,
  customerId?: string,
): Promise<
  ActionResponse<{
    invoiceId: string;
    outbox: {
      outboxIds: string[];
      alreadyQueuedIds: string[];
      processed: boolean;
    };
  }>
> {
  try {
    const result = await POSTransactionService.process(
      sessionId,
      items,
      paymentMethod,
      amountPaid,
      globalDiscount,
      customerId,
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to process POS transaction",
    };
  }
}

export async function holdOrder(
  cart: POSCartItem[],
  totalAmount: number,
  note?: string,
  customerId?: string,
  customerName?: string,
  globalDiscount: number = 0,
) {
  const session = await getSession();
  const userId = session?.userId;
  if (!userId) throw new Error("Unauthorized");

  const heldOrder = await HeldOrderService.hold(
    userId,
    cart,
    totalAmount,
    note,
    customerId,
    customerName,
    globalDiscount,
  );

  revalidatePath("/pos");
  return SuperJSON.serialize(heldOrder);
}

export async function validateDiscountCode(code: string) {
  const discount = await prisma.discount.findUnique({
    where: { code, isActive: true },
    include: {
      products: {
        select: { id: true },
      },
    },
  });

  if (!discount) {
    throw new Error("Invalid discount code");
  }

  const now = new Date();
  if (
    discount.startDate > now ||
    (discount.endDate && discount.endDate < now)
  ) {
    throw new Error("Discount code is expired or not yet active");
  }

  return SuperJSON.serialize(discount);
}

export async function getHeldOrders() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  await HeldOrderService.cleanupExpired();

  const heldOrders = await prisma.heldOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  return SuperJSON.serialize(heldOrders);
}

export async function getPOSInvoice(id: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      contact: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: {
        include: {
          cashAccount: true,
        },
      },
      salesOrder: true,
      posSession: true,
    },
  });

  if (!invoice) return null;

  return SuperJSON.serialize(invoice);
}

export async function resumeOrder(heldOrderId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const heldOrder = await HeldOrderService.resume(heldOrderId);

  revalidatePath("/pos");
  return SuperJSON.serialize(heldOrder);
}

export async function deleteHeldOrder(heldOrderId: string) {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  await HeldOrderService.delete(heldOrderId);

  revalidatePath("/pos");
}
