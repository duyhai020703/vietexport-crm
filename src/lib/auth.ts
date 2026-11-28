import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "tannhien_crm_session";
const SESSION_TTL_DAYS = 7;

export type UserRole = "ADMIN" | "MANAGER" | "SALES_ADMIN" | "SALE";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

/**
 * Resolves the active user from the HttpOnly Database Session cookie.
 * Returns null if no valid active session exists.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function createDbSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
  };
}

export function isManagerOrAdmin(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}

export function isSalesAdminOrAbove(role: string) {
  return role === "ADMIN" || role === "MANAGER" || role === "SALES_ADMIN";
}
