/**
 * Check if a value is a Prisma Decimal object
 */
function isDecimal(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== "object") return false;

  // Check for Decimal-like object (has toNumber method and constructor name)
  const obj = value as any;
  if (typeof obj.toNumber === "function") return true;
  if (obj.constructor?.name === "Decimal") return true;

  // Check for decimal.js style objects
  if ("d" in obj && "e" in obj && "s" in obj) return true;

  return false;
}

/**
 * Convert Decimal objects to numbers for client components
 * Prisma Decimal objects cannot be serialized and sent to client components
 *
 * This uses JSON stringify/parse which automatically converts Decimals to numbers
 * while preserving Dates (though they become strings and need to be converted back)
 */
export function convertDecimalToNumber<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Use JSON stringify/parse to convert Decimals to numbers
  // This is the most reliable way to handle nested Decimal objects
  const jsonString = JSON.stringify(obj, (key, value) => {
    // Convert Date objects to ISO strings for now
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Explicitly convert Prisma Decimal objects to numbers
    if (isDecimal(value)) {
      const obj = value as any;
      if (typeof obj.toNumber === "function") {
        return obj.toNumber();
      }
      // Fallback: parse as number
      return Number(obj.toString?.() ?? obj);
    }
    return value;
  });

  const parsed = JSON.parse(jsonString, (key, value) => {
    // Convert ISO date strings back to Date objects
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    return value;
  });

  return parsed;
}
