import { Prisma, SalesOrderStatus } from "@/prisma/generated/prisma/client";

type UserNameRef = { name: string } | null;

export type SalesOrderWithDetails = Prisma.SalesOrderGetPayload<{
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
            salesUnit: true;
          };
        };
      };
    };
  };
}> & {
  createdBy: UserNameRef;
  updatedBy: UserNameRef;
  confirmedBy: UserNameRef;
  closedBy: UserNameRef;
  cancelledBy: UserNameRef;
};

export type SalesOrderItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountRate?: number;
};

export type SalesOrderInput = {
  contactId: string;
  orderDate: Date;
  expectedDate?: Date | null;
  notes?: string | null;
  status?: SalesOrderStatus;
  items: SalesOrderItemInput[];
  attachmentIds?: string[];
  departmentId?: string | null;
  projectId?: string | null;
};
