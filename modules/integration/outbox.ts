import type { Prisma } from "@/prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getIntegrationHandlers } from "@/modules/integration/handlers";
import crypto from "node:crypto";
import { computeExponentialBackoffMs } from "@/modules/integration/backoff";

type Tx = Prisma.TransactionClient;

export type EnqueueIntegrationEventInput =
  | {
    topic: "INVENTORY";
    type: "INVENTORY_MOVEMENT_CREATED";
    aggregateType: "INVENTORY_MOVEMENT";
    aggregateId: string;
    payload: {
      movementId: string;
      type: string;
      transactionDate: Date;
    };
  }
  | {
    topic: "INVENTORY";
    type: "PRODUCT_CREATED";
    aggregateType: "PRODUCT";
    aggregateId: string;
    payload: {
      productId: string;
      name: string;
      sku: string;
    };
  }
  | {
    topic: string;
    type: string;
    aggregateType: string;
    aggregateId: string;
    payload: unknown;
  };

export async function enqueueIntegrationEvent(tx: Tx, input: EnqueueIntegrationEventInput) {
  return tx.integrationOutbox.create({
    data: {
      topic: input.topic,
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}

export async function enqueueIntegrationEventOnce(
  tx: Tx,
  input: EnqueueIntegrationEventInput,
  options?: { activeStatuses?: Array<"PENDING" | "FAILED" | "PROCESSING"> }
) {
  const activeStatuses = options?.activeStatuses ?? ["PENDING", "FAILED", "PROCESSING"];

  const existing = await tx.integrationOutbox.findFirst({
    where: {
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      status: { in: activeStatuses },
    },
    select: { id: true },
  });

  if (existing) {
    return { id: existing.id, alreadyQueued: true as const };
  }

  const created = await enqueueIntegrationEvent(tx, input);
  return { id: created.id, alreadyQueued: false as const };
}

export type DispatchPendingIntegrationEventsResult = {
  attempted: number;
  processed: number;
  failed: number;
};

function getIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

const workerId = process.env.INTEGRATION_WORKER_ID ?? crypto.randomUUID();
const maxAttempts = getIntEnv("INTEGRATION_MAX_ATTEMPTS", 10);
const lockTimeoutMs = getIntEnv("INTEGRATION_LOCK_TIMEOUT_MS", 60_000);
const backoffBaseMs = getIntEnv("INTEGRATION_BACKOFF_BASE_MS", 5_000);
const backoffMaxMs = getIntEnv("INTEGRATION_BACKOFF_MAX_MS", 5 * 60_000);

export async function dispatchPendingIntegrationEvents(
  options?: { limit?: number; concurrency?: number }
): Promise<DispatchPendingIntegrationEventsResult> {
  const limit = options?.limit ?? 50;
  const concurrency = Math.max(1, options?.concurrency ?? 4);
  const now = new Date();
  const staleBefore = new Date(now.getTime() - lockTimeoutMs);
  const pending = await prisma.integrationOutbox.findMany({
    where: {
      OR: [
        {
          status: { in: ["PENDING", "FAILED"] },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          attempts: { lt: maxAttempts },
        },
        {
          status: "PROCESSING",
          lockedAt: { lte: staleBefore },
          attempts: { lt: maxAttempts },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
    take: limit,
  });

  if (pending.length === 0) {
    return { attempted: 0, processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  const ids = pending.map((r) => r.id);
  let cursor = 0;

  const workerCount = Math.min(concurrency, ids.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const id = ids[cursor];
        cursor += 1;
        if (!id) return;
        try {
          await processIntegrationOutboxEvent(id);
          processed += 1;
        } catch {
          failed += 1;
        }
      }
    })
  );

  return { attempted: pending.length, processed, failed };
}

export async function processIntegrationOutboxEvent(outboxId: string) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - lockTimeoutMs);
  const claimed = await prisma.integrationOutbox.updateMany({
    where: {
      id: outboxId,
      attempts: { lt: maxAttempts },
      OR: [
        {
          status: { in: ["PENDING", "FAILED"] },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        {
          status: "PROCESSING",
          lockedAt: { lte: staleBefore },
        },
      ],
    },
    data: {
      status: "PROCESSING",
      lockedAt: now,
      lockedBy: workerId,
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  if (claimed.count === 0) return;

  const outbox = await prisma.integrationOutbox.findUnique({
    where: { id: outboxId },
    select: {
      id: true,
      type: true,
      payload: true,
      attempts: true,
    },
  });

  if (!outbox) return;

  const handlers = getIntegrationHandlers(outbox.type);
  if (!handlers) {
    await prisma.integrationOutbox.update({
      where: { id: outboxId },
      data: {
        status: "DEAD",
        deadAt: now,
        lastError: `No handler for ${outbox.type}`,
        lockedAt: null,
        lockedBy: null,
      },
    });
    return;
  }

  try {
    for (const handler of handlers) {
      await prisma.$transaction(async (tx) => {
        const alreadyProcessed = await tx.integrationInbox.findUnique({
          where: {
            consumer_outboxId: { consumer: handler.consumer, outboxId: outbox.id },
          },
          select: { id: true },
        });

        if (alreadyProcessed) {
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (handler as any).handle(tx, outbox.payload);

        await tx.integrationInbox.create({
          data: { consumer: handler.consumer, outboxId: outbox.id },
        });
      });
    }

    await prisma.integrationOutbox.update({
      where: { id: outboxId },
      data: {
        status: "PROCESSED",
        processedAt: now,
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const attempts = outbox.attempts;
    const isDead = attempts >= maxAttempts;
    const backoffMs = computeExponentialBackoffMs(attempts, {
      baseMs: backoffBaseMs,
      maxMs: backoffMaxMs,
    });
    const nextAttemptAt = new Date(now.getTime() + backoffMs);

    await prisma.integrationOutbox.update({
      where: { id: outboxId },
      data: isDead
        ? {
          status: "DEAD",
          deadAt: now,
          lastError: message,
          lockedAt: null,
          lockedBy: null,
        }
        : {
          status: "FAILED",
          lastError: message,
          nextAttemptAt,
          lockedAt: null,
          lockedBy: null,
        },
    });

    throw error;
  }
}

/**
 * Optionally process an outbox event inline after enqueue.
 *
 * Default is async (worker-only): set INTEGRATION_PROCESS_INLINE=true to process
 * immediately in-request. Pass forceInline to override for tests/critical paths.
 */
export async function maybeProcessIntegrationOutboxEvent(
  outboxId: string,
  options?: { forceInline?: boolean }
) {
  const inline =
    options?.forceInline === true || process.env.INTEGRATION_PROCESS_INLINE === "true";

  if (!inline) {
    return { processed: false as const };
  }

  await processIntegrationOutboxEvent(outboxId);
  return { processed: true as const };
}
