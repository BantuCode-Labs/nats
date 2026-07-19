/* eslint-disable @typescript-eslint/no-explicit-any */

import { Prisma, PrismaClient } from "@/prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Recursively serializes Prisma-specific and built-in JavaScript objects into
 * plain JSON-compatible values.
 *
 * This utility is useful when you need to return Prisma query results over
 * the wire (e.g., via an API endpoint) because:
 * - Prisma.Decimal instances must be converted to numbers or strings to be
 *   JSON-serializable.
 * - Date objects are typically serialized to ISO 8601 strings for consistency.
 * - Nested structures (arrays, objects) are traversed depth-first to ensure
 *   every leaf value is safe for JSON.stringify.
 *
 * @template T - The type of the input object; the same shape is returned.
 * @param obj - The value to serialize. Accepts any value, including
 *              primitives, arrays, and plain or Prisma-generated objects.
 * @returns A new value of the same shape as `obj`, but with all
 *          Prisma.Decimal converted to numbers, Date objects to ISO strings,
 *          and nested structures recursively processed.
 *
 * @example
 * const raw = await prisma.order.findFirst();
 * const safe = serializePrisma(raw);
 * // safe can now be passed to JSON.stringify or returned from an API route.
 */

export function serializePrisma<T>(obj: T): T {
  // Primitives that are null or undefined require no transformation.
  if (obj === null || obj === undefined) return obj;

  // Convert Prisma.Decimal to a plain number so it can be JSON-serialized.
  if (obj instanceof Prisma.Decimal) return obj.toNumber() as unknown as T;

  // Convert Date objects to ISO 8601 strings for consistent serialization.
  if (obj instanceof Date) return obj.toISOString() as unknown as T;

  // Recursively map each element in arrays.
  if (Array.isArray(obj)) return obj.map(serializePrisma) as unknown as T;

  // Recursively walk plain objects (including Prisma result objects).
  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const key in obj) {
      // Only process the object's own enumerable properties.
      if (Object.hasOwn(obj, key)) {
        result[key] = serializePrisma((obj as any)[key]);
      }
    }
    return result as T;
  }

  // Anything else (string, number, boolean, etc.) is returned as-is.
  return obj;
}
