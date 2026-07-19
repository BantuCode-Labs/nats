import { prisma } from "@/lib/prisma";
import { enqueueIntegrationEvent } from "@/modules/integration/outbox";
import { SalesShipmentInput } from "@/app/[locale]/(dashboard)/sales/shipments/types";
import { generateDocumentNumber } from "@/lib/document-numbering";

const INITIAL_DRAFT_STATUS = "DRAFT" as const;

export class SalesShipmentService {
  static async create(data: SalesShipmentInput, userId: string) {
    const shipmentNumber = await this.generateShipmentNumber();

    return await prisma.$transaction(async (tx) => {
      const result = await tx.salesShipment.create({
        data: {
          shipmentNumber,
          contactId: data.contactId,
          salesOrderId: data.salesOrderId,
          departmentId: data.departmentId,
          projectId: data.projectId,
          shipmentDate: data.shipmentDate,
          notes: data.notes,
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
          status: INITIAL_DRAFT_STATUS,
          createdById: userId,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              salesOrderItemId: item.salesOrderItemId,
            })),
          },
          attachments: data.attachmentIds
            ? { connect: data.attachmentIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          items: true,
        },
      });

      await enqueueIntegrationEvent(tx, {
        topic: "SALES",
        type: "SALES_SHIPMENT_CREATED",
        aggregateType: "SalesShipment",
        aggregateId: result.id,
        payload: {
          shipmentId: result.id,
          shipmentNumber: result.shipmentNumber,
          salesOrderId: data.salesOrderId,
          contactId: data.contactId,
          userId,
        },
      });

      return result;
    });
  }

  static async delete(id: string) {
    const currentShipment = await prisma.salesShipment.findUnique({
      where: { id },
    });

    if (!currentShipment) {
      throw new Error("Shipment not found");
    }

    if (currentShipment.status !== INITIAL_DRAFT_STATUS) {
      throw new Error("Can only delete draft shipments");
    }

    await prisma.salesShipment.delete({
      where: { id },
    });
  }

  private static async generateShipmentNumber(): Promise<string> {
    return await generateDocumentNumber(
      "SALES_SHIPMENT",
      "Sales Shipment",
      "SHP-",
    );
  }
}
