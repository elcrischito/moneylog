import type { NextFunction, Request, Response } from "express";

export interface ErrorDetail {
  field?: string;
  message: string;
}

// Every error leaves the API in one shape: { error: { code, message, details? } } (System SDS §4).
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: ErrorDetail[],
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string, details?: ErrorDetail[]) =>
  new AppError(400, code, message, details);
export const unauthenticated = () =>
  new AppError(401, "UNAUTHENTICATED", "You must be signed in.");
export const forbidden = () =>
  new AppError(403, "FORBIDDEN", "You do not have permission to do this.");
export const notFound = (what = "Resource") => new AppError(404, "NOT_FOUND", `${what} not found.`);

// Wraps async route handlers so rejected promises reach the error handler.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  if (err instanceof SyntaxError && "body" in (err as object)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request body is not valid JSON." } });
  }
  // Never leak stack traces or SQL to the client; log them on the server only.
  console.error(err);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
}
