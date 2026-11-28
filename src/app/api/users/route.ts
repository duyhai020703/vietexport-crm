import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage = isManagerOrAdmin(currentUser.role);
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ...(canManage
          ? {
              isActive: true,
              mustChangePassword: true,
              createdAt: true,
            }
          : {}),
      },
    });

    return NextResponse.json({ users, currentUser });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách nhân viên." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isManagerOrAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: "Chỉ Trưởng phòng / Admin mới có quyền tạo tài khoản nhân viên." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, role = "SALE", tempPassword } = body as {
      name?: string;
      email?: string;
      role?: Role;
      tempPassword?: string;
    };

    if (!name?.trim() || !email?.trim() || !tempPassword || tempPassword.length < 6) {
      return NextResponse.json(
        { error: "Vui lòng nhập Họ tên, Email và Mật khẩu tạm (tối thiểu 6 ký tự)." },
        { status: 400 }
      );
    }

    if (role === "ADMIN" && currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Chỉ Admin mới có quyền tạo tài khoản Admin." },
        { status: 403 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Email "${normalizedEmail}" đã tồn tại trong hệ thống.` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        role,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
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

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { error: "Không thể tạo tài khoản nhân viên." },
      { status: 500 }
    );
  }
}
