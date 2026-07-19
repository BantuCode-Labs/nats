import {
  Prisma,
  PurchaseInvoiceStatus,
} from "@/prisma/generated/prisma/client";

export interface PurchaseInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  taxRateId?: string;
  accountId?: string;
}

export interface PurchaseInvoiceInput {
  invoiceNumber: string;
  contactId: string;
  purchaseOrderId?: string;
  invoiceDate: Date;
  dueDate: Date;
  notes?: string;
  status?: PurchaseInvoiceStatus;

  globalDiscount: number;
  totalTax: number;
  shippingCost: number;
  handlingCost: number;

  departmentId?: string | null;
  projectId?: string | null;

  items: PurchaseInvoiceItemInput[];
  attachmentIds?: string[];
}

type UserNameRef = { name: string } | null;

export type PurchaseInvoiceWithDetails = Prisma.PurchaseInvoiceGetPayload<{
  include: {
    contact: true;
    purchaseOrder: true;
    department: true;
    project: true;
    items: true;
    payments: true;
    attachments: true;
  };
}> & {
  createdBy: UserNameRef;
  updatedBy: UserNameRef;
  billedBy: UserNameRef;
  cancelledBy: UserNameRef;
};
