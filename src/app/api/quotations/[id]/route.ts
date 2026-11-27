import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import type {
  QuoteApprovalStatus,
  SpecsCheckStatus,
} from "@/generated/prisma/client";

async function generateNextOrderCode(): Promise<string> {
  const year2 = String(new Date().getFullYear()).slice(-2);
  const prefix = `ORD-${year2}-`;
  const existing = await prisma.order.findMany({
    where: { orderCode: { startsWith: prefix } },
    select: { orderCode: true },
  });

  let maxNum = 0;
  for (const o of existing) {
    const suffix = o.orderCode.slice(prefix.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy báo giá." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, approvalStatus, specsCheckStatus, moq, leadTimeDays, poNumber } =
      body as {
        action?: "CONVERT_TO_ORDER";
        approvalStatus?: QuoteApprovalStatus;
        specsCheckStatus?: SpecsCheckStatus;
        moq?: string;
        leadTimeDays?: number | null;
        poNumber?: string;
      };

    // Chuyển đổi Báo giá đã duyệt -> Đơn hàng điều phối
    if (action === "CONVERT_TO_ORDER") {
      if (
        existing.approvalStatus !== "APPROVED" &&
        existing.approvalStatus !== "AUTO_APPROVED"
      ) {
        return NextResponse.json(
          { error: "Báo giá cần được Trưởng phòng duyệt trước khi chuyển thành Đơn hàng." },
          { status: 400 }
        );
      }

      if (existing.convertedOrderId) {
        return NextResponse.json(
          { error: "Báo giá này đã được chuyển thành đơn hàng." },
          { status: 400 }
        );
      }

      const orderCode = await generateNextOrderCode();
      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderCode,
            poNumber: poNumber?.trim() || null,
            customerId: existing.customerId,
            salesRepId: existing.salesRepId,
            orderType: existing.quoteType,
            incoterm: existing.incoterm,
            orderDate: new Date(),
            contractDate: new Date(),
            status: "CONFIRMED",
            totalAmount: existing.totalAmount,
            notes: `Chuyển đổi từ ${existing.quoteCode}_v${existing.version}. ${existing.specsNotes ?? ""}`.trim(),
            items: {
              create: existing.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
              })),
            },
          },
        });

        const updatedQuote = await tx.quotation.update({
          where: { id },
          data: { convertedOrderId: order.id },
          include: {
            customer: {
              select: {
                id: true,
                customerCode: true,
                companyName: true,
                countryRegion: true,
              },
            },
            salesRep: { select: { id: true, name: true, role: true } },
            approvedBy: { select: { id: true, name: true } },
            items: { include: { product: true } },
          },
        });

        await tx.customer.update({
          where: { id: existing.customerId },
          data: { pipelineStage: "ACTIVE_WON", lastActivityAt: new Date() },
        });

        return { order, quotation: updatedQuote };
      });

      return NextResponse.json(result);
    }

    // Duyệt / Từ chối báo giá (chỉ Trưởng phòng / Admin)
    if (approvalStatus && !isManagerOrAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: "Chỉ Trưởng phòng / Admin mới có quyền duyệt báo giá." },
        { status: 403 }
      );
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(approvalStatus
          ? { approvalStatus, approvedById: currentUser.id }
          : {}),
        ...(specsCheckStatus ? { specsCheckStatus } : {}),
        ...(moq !== undefined ? { moq: moq?.trim() || null } : {}),
        ...(leadTimeDays !== undefined
          ? { leadTimeDays: leadTimeDays !== null ? Number(leadTimeDays) : null }
          : {}),
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            companyName: true,
            countryRegion: true,
          },
        },
        salesRep: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
    });

    return NextResponse.json({ quotation: updated });
  } catch (error) {
    console.error("PATCH /api/quotations/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật báo giá." },
      { status: 500 }
    );
  }
}

