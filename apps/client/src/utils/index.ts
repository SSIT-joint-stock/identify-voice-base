/**
 * Formats an error to a human-readable string.
 */
export function formatError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "An unexpected error occurred";
}

/**
 * Delays execution for a specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to the specified length.
 */
export function truncate(str: string, length: number, suffix = "..."): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + suffix;
}

/**
 * Checks if a value is not null and not undefined.
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Removes undefined keys from an object.
 */
export function cleanObject<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export * from "./constant";
export * from "./translate-process.utils";
