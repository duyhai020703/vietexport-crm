import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  createDbSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập Email và Mật khẩu." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email hoặc mật khẩu không đúng." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Tài khoản đã bị khóa. Vui lòng liên hệ Trưởng phòng / Admin." },
        { status: 403 }
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minsLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Tài khoản tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${minsLeft} phút.`,
        },
        { status: 429 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
            : null,
        },
      });

      return NextResponse.json(
        {
          error: shouldLock
            ? `Nhập sai quá ${MAX_FAILED_ATTEMPTS} lần. Tài khoản bị tạm khóa ${LOCK_MINUTES} phút.`
            : "Email hoặc mật khẩu không đúng.",
        },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const { token, expiresAt } = await createDbSession(user.id);

    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });

    res.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions(expiresAt)
    );

    return res;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi đăng nhập." },
      { status: 500 }
    );
  }
}
