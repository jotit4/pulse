import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { AuthConfig } from "../config";

export function setSessionCookie(c: Context, config: AuthConfig, token: string): void {
  setCookie(c, config.cookieName, token, {
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: config.sameSite,
    path: "/",
    maxAge: config.sessionTtlDays * 24 * 60 * 60,
  });
}

export function clearSessionCookie(c: Context, config: AuthConfig): void {
  deleteCookie(c, config.cookieName, { path: "/" });
}
