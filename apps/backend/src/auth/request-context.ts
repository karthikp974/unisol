import { Request } from "express";

export type RequestContext = {
  userAgent?: string;
  ipAddress?: string;
};

export function getRequestContext(request: Request): RequestContext {
  const forwardedFor = request.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim() || request.ip;

  return {
    userAgent: request.headers["user-agent"],
    ipAddress
  };
}
