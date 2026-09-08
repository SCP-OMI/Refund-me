/**
 * Error utilities for safe error handling in production
 * Prevents leaking sensitive stack traces or internal details to clients
 */

import { logger } from "@/lib/logger";

const isProduction = process.env.NODE_ENV === "production";

// Error messages safe to expose to clients
const SAFE_ERRORS: Record<string, string> = {
  Unauthorized: "You are not authorized to perform this action",
  "Unauthorized: Staff access required": "Staff access required for this action",
  "Unauthorized: You don't own this request": "You don't have permission to modify this request",
  "Request not found": "The requested item could not be found",
  "Invalid receipt URL": "Invalid receipt provided",
  "No file uploaded": "Please select a file to upload",
};

/**
 * Safely format an error for client consumption
 * In production, only expose known safe error messages
 */
export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  
  // Check if this is a known safe error
  if (SAFE_ERRORS[message]) {
    return SAFE_ERRORS[message];
  }
  
  // In development, show the actual error
  if (!isProduction) {
    return message;
  }
  
  // In production, return a generic message for unknown errors
  logger.error({ err: error }, "[Server Error]");
  return "An unexpected error occurred. Please try again later.";
}

/**
 * Log error server-side and return a safe error for the client
 */
export function handleActionError(error: unknown, context?: string): never {
  const logMessage = context ? `[${context}]` : "[Action Error]";
  logger.error({ err: error }, logMessage);
  
  throw new Error(safeError(error));
}

/**
 * Wrap an async action with safe error handling
 */
export function withSafeErrors<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleActionError(error, context);
    }
  }) as T;
}
