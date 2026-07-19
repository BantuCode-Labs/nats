import { Prisma } from "@/prisma/generated/prisma/client";

export type PurchasePaymentInput = {
  paymentNumber: string;
  contactId: string;
  purchaseInvoiceId: string;
  paymentDate: Date;
  amount: number;
  reference?: string;
  notes?: string;
  departmentId?: string | null;
  projectId?: string | null;
  cashAccountId: string;
  attachmentIds?: string[];
};

type UserNameRef = { name: string } | null;

export type PurchasePaymentWithDetails = Prisma.PurchasePaymentGetPayload<{
  include: {
    contact: true;
    purchaseInvoice: true;
    cashAccount: true;
    journalEntry: true;
    department: true;
    project: true;
    attachments: true;
  };
}> & {
  createdBy: UserNameRef;
  updatedBy: UserNameRef;
  postedBy: UserNameRef;
};
