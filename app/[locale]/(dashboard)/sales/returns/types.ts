import { Prisma } from "@/prisma/generated/prisma/client";

type UserNameRef = { name: string } | null;

export type SalesReturnWithDetails = Prisma.SalesReturnGetPayload<{
  include: {
    contact: true;
    salesOrder: true;
    salesInvoice: true;
    items: {
      include: {
        product: {
          include: {
            baseUnit: true,
            salesUnit: true,
          },
        },
      },
    };
    attachments: true;
  };
}> & {
  createdBy: UserNameRef;
  updatedBy: UserNameRef;
  approvedBy: UserNameRef;
  completedBy: UserNameRef;
  cancelledBy: UserNameRef;
};

export interface SalesReturnItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesReturnInput {
  returnNumber: string;
  contactId: string;
  salesOrderId?: string;
  salesInvoiceId?: string;
  departmentId?: string | null;
  projectId?: string | null;
  returnDate: Date;
  reason?: string;
  notes?: string;
  status?: "DRAFT" | "APPROVED" | "COMPLETED" | "CANCELLED";
  items: SalesReturnItemInput[];
  attachmentIds?: string[];
}
