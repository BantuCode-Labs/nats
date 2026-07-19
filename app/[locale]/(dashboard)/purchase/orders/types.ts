import { Prisma, PurchaseOrderStatus } from "@/prisma/generated/prisma/client";

type UserNameRef = { name: string } | null;

export type PurchaseOrderWithDetails = Prisma.PurchaseOrderGetPayload<{
  include: {
    contact: true;
    department: true;
    project: true;
    attachments: true;
    items: {
      include: {
        product: {
          include: {
            baseUnit: true;
            purchaseUnit: true;
          };
        };
      };
    };
  };
}> & {
  createdBy: UserNameRef;
  updatedBy: UserNameRef;
  issuedBy: UserNameRef;
  closedBy: UserNameRef;
  cancelledBy: UserNameRef;
};

export type PurchaseOrderItemInput = {
  productId: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrderInput = {
  contactId: string;
  orderDate: Date;
  expectedDate?: Date | null;
  notes?: string | null;
  status?: PurchaseOrderStatus;
  items: PurchaseOrderItemInput[];
  attachmentIds?: string[];
  departmentId?: string | null;
  projectId?: string | null;
};
