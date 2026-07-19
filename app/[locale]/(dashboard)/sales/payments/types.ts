import { Prisma } from "@/prisma/generated/prisma/client";

export type SalesPaymentInput = {
  paymentNumber: string;
  contactId: string;
  salesInvoiceId: string;
  paymentDate: Date;
  amount: number;
  reference?: string;
  notes?: string;
  method?: string;
  departmentId?: string | null;
  projectId?: string | null;
  cashAccountId: string;
  attachmentIds?: string[];
};

type UserNameRef = { name: string } | null;

export type SalesPaymentWithDetails = Prisma.SalesPaymentGetPayload<{
  include: {
    contact: true;
    salesInvoice: true;
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
