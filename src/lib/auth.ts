import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const USER_COOKIE_NAME = "export_crm_user_id";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "SALE";
}

/**
 * Resolves the active user from request headers or cookies.
 * Falls back to the first ADMIN (or any first user) for demo convenience.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  const userId =
    headerStore.get("x-user-id") ||
    cookieStore.get(USER_COOKIE_NAME)?.value;

  if (userId) {
    const found = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (found) return found;
  }

  const fallback = await prisma.user.findFirst({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return fallback;
}

export function isManagerOrAdmin(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}

