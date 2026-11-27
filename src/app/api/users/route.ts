import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, USER_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  try {
    const [users, currentUser] = await Promise.all([
      prisma.user.findMany({
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, email: true, role: true },
      }),
      getCurrentUser(),
    ]);

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
    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId) {
      return NextResponse.json(
        { error: "Thiếu userId." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên." },
        { status: 404 }
      );
    }

    const res = NextResponse.json({ currentUser: user });
    res.cookies.set(USER_COOKIE_NAME, user.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { error: "Không thể chuyển đổi tài khoản." },
      { status: 500 }
    );
  }
}

