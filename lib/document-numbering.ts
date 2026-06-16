import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { formatSequence } from "@/lib/utils/format-sequence";
import { getSession } from "@/lib/auth/auth";

/**
 * Ensures a document numbering format exists for an entity type or creates the default.
 */
export async function getOrCreateDocumentNumbering(
  entityType: string,
  defaultName: string = entityType,
  defaultPrefix: string = "",
) {
  let docFormat = await prisma.documentNumbering.findUnique({
    where: { entityType },
  });

  if (!docFormat) {
    // We try to create if it doesn't exist, safely catching uniqueness constraint violations
    // if another request does this concurrently.
    try {
      docFormat = await prisma.documentNumbering.create({
        data: {
          entityType,
          name: defaultName,
          prefix: defaultPrefix,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        docFormat = await prisma.documentNumbering.findUniqueOrThrow({
          where: { entityType },
        });
      } else {
        throw error;
      }
    }
  }

  return docFormat;
}

/**
 * Atomically generates the next formatted sequence number for the given entity type.
 */
export async function generateDocumentNumber(
  entityType: string,
  defaultName?: string,
  defaultPrefix?: string,
): Promise<string> {
  const session = await getSession();

  // Ensure the settings row exists.
  await getOrCreateDocumentNumbering(
    entityType,
    defaultName ?? entityType,
    defaultPrefix ?? "",
  );

  // Use a transaction to lock the row and dynamically increment or reset the sequence.
  // Note: For raw SQL level concurrency control relying purely on Prisma's sequential operations or atomic increments
  // Prisma's increment does not allow conditional updates based on other row columns easily via Prisma client level updates.
  // Since we need to check the date for resets, we use a $transaction with read and update.

  const result = await prisma.$transaction(
    async (tx) => {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // 1. Lock the DocumentNumbering row first with SELECT ... FOR UPDATE.
      //    This serializes concurrent generators on the same entityType and
      //    establishes a consistent lock order (DocumentNumbering -> TenantTransactionMonthly)
      //    to prevent deadlocks.
      const formatRows = await tx.$queryRaw<
        Array<{
          currentSequence: number;
          prefix: string;
          suffix: string;
          sequenceDigits: number;
          includeYear: boolean;
          yearFormat: string;
          includeMonth: boolean;
          resetYearly: boolean;
          resetMonthly: boolean;
          lastGeneratedAt: Date | null;
        }>
      >`
            SELECT
                "currentSequence", "prefix", "suffix", "sequenceDigits",
                "includeYear", "yearFormat", "includeMonth",
                "resetYearly", "resetMonthly", "lastGeneratedAt"
            FROM "DocumentNumbering"
            WHERE "entityType" = ${entityType}
            FOR UPDATE
        `;
      const format = formatRows[0];

      // 2. Atomically increment the monthly counter in a single statement.
      //    Replaces the findUnique -> create -> update sequence that raced
      //    under concurrency and produced the deadlock.
      await tx.tenantTransactionMonthly.upsert({
        where: { yearMonth },
        create: { yearMonth, count: 1 },
        update: { count: { increment: 1 } },
      });

      let isYearReset = false;
      let isMonthReset = false;

      if (format.lastGeneratedAt) {
        if (
          format.resetYearly &&
          format.lastGeneratedAt.getFullYear() !== now.getFullYear()
        ) {
          isYearReset = true;
        }
        if (
          format.resetMonthly &&
          format.lastGeneratedAt.getMonth() !== now.getMonth()
        ) {
          isMonthReset = true;
        }
      }

      const newSequence =
        isYearReset || isMonthReset ? 1 : format.currentSequence + 1;

      // 3. We already hold the row lock from step 1, so a plain update is safe
      //    and the optimistic-concurrency predicate (which caused 0-row writes
      //    and write conflicts under RepeatableRead) is no longer needed.
      await tx.documentNumbering.update({
        where: { entityType },
        data: {
          currentSequence: newSequence,
          lastGeneratedAt: now,
        },
      });

      // 4. Format the result string
      return formatSequence(
        newSequence,
        format.prefix,
        format.suffix,
        format.sequenceDigits,
        format.includeYear,
        format.yearFormat,
        format.includeMonth,
        now,
      );
    },
    {
      // ReadCommitted is sufficient now that we take an explicit row lock with
      // FOR UPDATE. RepeatableRead previously held gap/next-key locks on the
      // read paths that contributed to deadlocks.
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000, // wait up to 5s for the lock
      timeout: 10000, // transaction timeout
    },
  );

  return result;
}
