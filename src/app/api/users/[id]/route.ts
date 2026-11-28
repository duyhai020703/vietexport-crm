import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: "Chỉ Trưởng phòng / Admin mới có quyền cập nhật tài khoản." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { isActive, role, tempPassword } = body as {
      isActive?: boolean;
      role?: Role;
      tempPassword?: string;
    };

    if (id === currentUser.id && isActive === false) {
      return NextResponse.json(
        { error: "Không thể tự khóa tài khoản đang đăng nhập." },
        { status: 400 }
      );
    }

    if (role === "ADMIN" && currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Chỉ Admin mới có quyền nâng lên Admin." },
        { status: 403 }
      );
    }

    let passwordHash: string | undefined;
    if (tempPassword) {
      if (tempPassword.length < 6) {
        return NextResponse.json(
          { error: "Mật khẩu tạm phải có ít nhất 6 ký tự." },
          { status: 400 }
        );
      }
      passwordHash = await bcrypt.hash(tempPassword, 10);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          ...(isActive !== undefined ? { isActive } : {}),
          ...(role !== undefined ? { role } : {}),
          ...(passwordHash
            ? {
                passwordHash,
                mustChangePassword: true,
                failedLoginAttempts: 0,
                lockedUntil: null,
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });

      // Thu hồi toàn bộ session ngay lập tức nếu khóa tài khoản hoặc reset mật khẩu
      if (isActive === false || passwordHash) {
        await tx.session.deleteMany({ where: { userId: id } });
      }

      return u;
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật tài khoản." },
      { status: 500 }
    );
  }
}
