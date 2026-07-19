import {
  Prisma,
  SalesInvoiceStatus,
} from "@/prisma/generated/prisma/client";

export interface SalesInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  taxRateId?: string;
  productId?: string;
  accountId?: string;
}

export interface SalesInvoiceInput {
  invoiceNumber: string;
  contactId: string;
  salesOrderId?: string;
  invoiceDate: Date;
  dueDate: Date;
  notes?: string;
  status?: SalesInvoiceStatus;

  globalDiscount: number;
  totalTax: number;
  shippingCost: number;

  departmentId?: string | null;
  projectId?: string | null;

  items: SalesInvoiceItemInput[];
  attachmentIds?: string[];
}

type UserNameRef = { name: string } | null;

export type SalesInvoiceWithDetails = Prisma.SalesInvoiceGetPayload<{
  include: {
    contact: true;
    salesOrder: true;
    department: true;
    project: true;
    items: true;
    payments: true;
    attachments: true;
  };
}> & {
  createdBy: UserNameRef;
  updatedBy: UserNameRef;
  issuedBy: UserNameRef;
  cancelledBy: UserNameRef;
};
