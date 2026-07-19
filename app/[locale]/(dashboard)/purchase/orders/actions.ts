"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/prisma/generated/prisma/client";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { getSession } from "@/lib/auth/auth";
import { PurchaseOrderInput } from "./types";
import { SuperJSON } from "@/lib/superjson";
import { hasPermission } from "@/lib/permissions/utils";
import { PurchaseOrderService } from "@/modules/purchase/services/purchase-order.service";

export async function getPurchaseOrders(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  startDate?: string,
  endDate?: string,
) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "purchase.view")) {
    return {
      orders: [],
      total: 0,
      totalPages: 0,
    };
  }

  const skip = (page - 1) * limit;
  const where: Prisma.PurchaseOrderWhereInput = {
    AND: [],
  };

  if (search) {
    (where.AND as unknown as Prisma.PurchaseOrderWhereInput[]).push({
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { contact: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (status && status !== "ALL") {
    (where.AND as unknown as Prisma.PurchaseOrderWhereInput[]).push({
      status: status as unknown as Prisma.EnumPurchaseOrderStatusFilter,
    });
  }

  if (startDate || endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      // Set end date to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    (where.AND as unknown as Prisma.PurchaseOrderWhereInput[]).push({
      orderDate: dateFilter,
    });
  }

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        contact: true,
        department: true,
        project: true,
        items: {
          include: {
            product: {
              include: {
                baseUnit: true,
                purchaseUnit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    orders: SuperJSON.serialize(orders),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

async function resolveUserNames(userIds: Array<string | null | undefined>) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) {
    return new Map<string, string>();
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  return new Map(users.map((user) => [user.id, user.name]));
}

function userNameRef(
  userId: string | null | undefined,
  nameById: Map<string, string>,
) {
  if (!userId) return null;
  return { name: nameById.get(userId) || userId };
}

export async function getPurchaseOrder(id: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "purchase.view")) {
    return null;
  }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      contact: true,
      department: true,
      project: true,
      attachments: true,
      items: {
        include: {
          product: {
            include: {
              baseUnit: true,
              purchaseUnit: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  const nameById = await resolveUserNames([
    order.createdById,
    order.updatedById,
    order.issuedById,
    order.closedById,
    order.cancelledById,
  ]);

  return SuperJSON.serialize({
    ...order,
    createdBy: userNameRef(order.createdById, nameById),
    updatedBy: userNameRef(order.updatedById, nameById),
    issuedBy: userNameRef(order.issuedById, nameById),
    closedBy: userNameRef(order.closedById, nameById),
    cancelledBy: userNameRef(order.cancelledById, nameById),
  });
}



export const createPurchaseOrder = authorizedAction(
  "purchase.create",
  async (data: PurchaseOrderInput) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const result = await PurchaseOrderService.create(data, session.userId);

      revalidatePath("/purchase/orders");
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to create PO:", error);
      return { success: false, error: "Failed to create Purchase Order" };
    }
  },
);

export const updatePurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string, data: PurchaseOrderInput) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const result = await PurchaseOrderService.update(id, data, session.userId);

      revalidatePath("/purchase/orders");
      revalidatePath(`/purchase/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to update PO:", error);
      const message = error instanceof Error ? error.message : "Failed to update Purchase Order";
      return { success: false, error: message };
    }
  },
);

export const issuePurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string) => {
    try {
      const result = await PurchaseOrderService.issue(id);

      revalidatePath("/purchase/orders");
      revalidatePath(`/purchase/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to issue PO:", error);
      const message = error instanceof Error ? error.message : "Failed to issue Purchase Order";
      return { success: false, error: message };
    }
  },
);

export const cancelPurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string) => {
    try {
      const result = await PurchaseOrderService.cancel(id);

      revalidatePath("/purchase/orders");
      revalidatePath(`/purchase/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to cancel PO:", error);
      const message = error instanceof Error ? error.message : "Failed to cancel Purchase Order";
      return { success: false, error: message };
    }
  },
);

export const closePurchaseOrder = authorizedAction(
  "purchase.edit",
  async (id: string) => {
    try {
      const session = await getSession();
      if (!session) throw new Error("Unauthorized");

      const result = await PurchaseOrderService.close(id, session.userId);

      revalidatePath("/purchase/orders");
      revalidatePath(`/purchase/orders/${id}`);
      return { success: true, data: SuperJSON.serialize(result) };
    } catch (error) {
      console.error("Failed to close PO:", error);
      const message = error instanceof Error ? error.message : "Failed to close Purchase Order";
      return { success: false, error: message };
    }
  },
);

export const deletePurchaseOrder = authorizedAction(
  "purchase.delete",
  async (id: string) => {
    try {
      await PurchaseOrderService.delete(id);
      revalidatePath("/purchase/orders");
      return { success: true };
    } catch (error) {
      console.error("Failed to delete PO:", error);
      const message = error instanceof Error ? error.message : "Failed to delete Purchase Order";
      return { success: false, error: message };
    }
  },
);
