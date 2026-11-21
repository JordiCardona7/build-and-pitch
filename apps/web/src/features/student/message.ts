import { ApiError } from "@/shared/api";

export function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.detail;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
