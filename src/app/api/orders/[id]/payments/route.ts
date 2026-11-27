import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSalesAdminOrAbove } from "@/lib/auth";
import type { PaymentType } from "@/generated/prisma/client";

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
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 }
      );
    }

    if (
      !isSalesAdminOrAbove(currentUser.role) &&
      order.salesRepId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền cập nhật thanh toán cho đơn này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { paymentType = "DEPOSIT", amount, dueDate, paidDate, swiftRef, notes } =
      body as {
        paymentType?: PaymentType;
        amount?: number;
        dueDate?: string | null;
        paidDate?: string | null;
        swiftRef?: string | null;
        notes?: string | null;
      };

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Số tiền thanh toán phải lớn hơn 0." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.orderPayment.create({
        data: {
          orderId: id,
          paymentType,
          amount: numericAmount,
          dueDate: dueDate ? new Date(dueDate) : null,
          paidDate: paidDate ? new Date(paidDate) : new Date(),
          swiftRef: swiftRef?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      const allPayments = await tx.orderPayment.findMany({
        where: { orderId: id },
        select: { amount: true },
      });

      const paidAmount = Number(
        allPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)
      );

      await tx.order.update({
        where: { id },
        data: { paidAmount },
      });

      return { payment, paidAmount };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders/[id]/payments error:", error);
    return NextResponse.json(
      { error: "Không thể ghi nhận thanh toán." },
      { status: 500 }
    );
  }
}

