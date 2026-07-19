import { Prisma } from "@/prisma/generated/prisma/client";

type UserNameRef = { name: string } | null;

export type SalesShipmentWithDetails = Prisma.SalesShipmentGetPayload<{
  include: {
    contact: true;
    salesOrder: true;
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
    attachments: true;
  };
}> & {
  createdBy: UserNameRef;
  updatedBy: UserNameRef;
  completedBy: UserNameRef;
  cancelledBy: UserNameRef;
};

export interface SalesShipmentItemInput {
  productId: string;
  quantity: number;
  salesOrderItemId?: string;
}

export interface SalesShipmentInput {
  contactId: string;
  salesOrderId?: string;
  departmentId?: string | null;
  projectId?: string | null;
  shipmentDate: Date;
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
  items: SalesShipmentItemInput[];
  attachmentIds?: string[];
}
