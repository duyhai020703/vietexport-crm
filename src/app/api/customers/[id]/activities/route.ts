import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json(
        { error: "Không tìm thấy khách hàng." },
        { status: 404 }
      );
    }

    if (
      !isManagerOrAdmin(currentUser.role) &&
      customer.salesRepId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền ghi nhật ký cho khách hàng này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { channel, summary, nextFollowUpDate } = body as {
      channel?: string;
      summary?: string;
      nextFollowUpDate?: string | null;
    };

    if (!channel?.trim() || !summary?.trim()) {
      return NextResponse.json(
        { error: "Vui lòng chọn hình thức trao đổi và nhập nội dung tóm tắt." },
        { status: 400 }
      );
    }

    const parsedFollowUp = nextFollowUpDate ? new Date(nextFollowUpDate) : null;

    const activity = await prisma.$transaction(async (tx) => {
      const created = await tx.customerActivity.create({
        data: {
          customerId: id,
          userId: currentUser.id,
          channel: channel.trim(),
          summary: summary.trim(),
          nextFollowUpDate: parsedFollowUp,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      await tx.customer.update({
        where: { id },
        data: {
          lastActivityAt: new Date(),
          ...(parsedFollowUp !== null ? { nextFollowUpDate: parsedFollowUp } : {}),
        },
      });

      return created;
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers/[id]/activities error:", error);
    return NextResponse.json(
      { error: "Không thể lưu nhật ký tương tác." },
      { status: 500 }
    );
  }
}

