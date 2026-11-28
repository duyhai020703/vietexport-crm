import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });
    if (!dbUser) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản." },
        { status: 404 }
      );
    }

    const validCurrent = await bcrypt.compare(
      currentPassword,
      dbUser.passwordHash
    );
    if (!validCurrent) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng." },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error);
    return NextResponse.json(
      { error: "Không thể đổi mật khẩu." },
      { status: 500 }
    );
  }
}

