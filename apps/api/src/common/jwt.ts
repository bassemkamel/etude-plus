import jwt from "jsonwebtoken";

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 30;

export function accessSecret() {
  return process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me-32chars";
}
export function refreshSecret() {
  return process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me-32chars";
}

export function signAccessToken(payload: { sub: string; role: string }) {
  return jwt.sign(payload, accessSecret(), { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: { sub: string; jti: string }) {
  return jwt.sign(payload, refreshSecret(), { expiresIn: `${REFRESH_TTL_DAYS}d` });
}

export function verifyAccess(token: string) {
  return jwt.verify(token, accessSecret()) as { sub: string; role: string };
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, refreshSecret()) as { sub: string; jti: string };
}

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const refreshCookieOpts = {
  ...cookieOpts,
  path: "/api/v1/auth",
  maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60,
};

export const accessCookieOpts = {
  ...cookieOpts,
  maxAge: 15 * 60,
};
