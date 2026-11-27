import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSalesAdminOrAbove } from "@/lib/auth";
import {
  ORDER_ITEM_PRODUCT_SELECT,
  prepareOrderItems,
  type OrderItemInput,
} from "@/lib/order-helpers";
import type { Incoterm, OrderStatus, OrderType } from "@/generated/prisma/client";

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
    const existing = await prisma.order.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 }
      );
    }

    if (
      !isSalesAdminOrAbove(currentUser.role) &&
      existing.salesRepId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền cập nhật đơn hàng này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      status,
      orderType,
      incoterm,
      poNumber,
      productionOrderNo,
      contractDate,
      estProductionDate,
      actualProductionDate,
      packagingStatus,
      qaQcStatus,
      stuffingDate,
      etd,
      eta,
      docsStatus,
      dhlTracking,
      containerCount,
      containerType,
      paymentStatus,
      notes,
      orderDate,
      items,
    } = body as {
      status?: OrderStatus;
      orderType?: OrderType;
      incoterm?: Incoterm;
      poNumber?: string | null;
      productionOrderNo?: string | null;
      contractDate?: string | null;
      estProductionDate?: string | null;
      actualProductionDate?: string | null;
      packagingStatus?: string | null;
      qaQcStatus?: string | null;
      stuffingDate?: string | null;
      etd?: string | null;
      eta?: string | null;
      docsStatus?: string | null;
      dhlTracking?: string | null;
      containerCount?: number;
      containerType?: string | null;
      paymentStatus?: string | null;
      notes?: string | null;
      orderDate?: string;
      items?: OrderItemInput[];
    };

    const parseDateOrNull = (val: string | null | undefined) => {
      if (val === undefined) return undefined;
      if (!val) return null;
      return new Date(val);
    };

    if (Array.isArray(items) && items.length === 0) {
      return NextResponse.json(
        { error: "Đơn hàng phải có ít nhất 1 sản phẩm." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      let totalAmount = existing.totalAmount;

      if (Array.isArray(items) && items.length > 0) {
        const prepared = prepareOrderItems(items).map((item) => ({
          ...item,
          orderId: id,
        }));
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        totalAmount = Number(
          prepared.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
        );
        await tx.orderItem.createMany({ data: prepared });
      }

      const trimmedContainerType =
        containerType !== undefined ? containerType?.trim() || null : undefined;
      if (trimmedContainerType) {
        await tx.containerType.upsert({
          where: { name: trimmedContainerType },
          update: {},
          create: { name: trimmedContainerType },
        });
      }

      const nextStatus = status ?? existing.status;

      return tx.order.update({
        where: { id },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(orderType !== undefined ? { orderType } : {}),
          ...(incoterm !== undefined ? { incoterm } : {}),
          ...(poNumber !== undefined ? { poNumber: poNumber?.trim() || null } : {}),
          ...(productionOrderNo !== undefined
            ? { productionOrderNo: productionOrderNo?.trim() || null }
            : {}),
          ...(contractDate !== undefined
            ? { contractDate: parseDateOrNull(contractDate) }
            : {}),
          ...(estProductionDate !== undefined
            ? { estProductionDate: parseDateOrNull(estProductionDate) }
            : {}),
          ...(actualProductionDate !== undefined
            ? { actualProductionDate: parseDateOrNull(actualProductionDate) }
            : {}),
          ...(packagingStatus !== undefined
            ? { packagingStatus: packagingStatus?.trim() || null }
            : {}),
          ...(qaQcStatus !== undefined
            ? { qaQcStatus: qaQcStatus?.trim() || null }
            : {}),
          ...(stuffingDate !== undefined
            ? { stuffingDate: parseDateOrNull(stuffingDate) }
            : {}),
          ...(etd !== undefined ? { etd: parseDateOrNull(etd) } : {}),
          ...(eta !== undefined ? { eta: parseDateOrNull(eta) } : {}),
          ...(docsStatus !== undefined
            ? { docsStatus: docsStatus?.trim() || null }
            : {}),
          ...(dhlTracking !== undefined
            ? { dhlTracking: dhlTracking?.trim() || null }
            : {}),
          ...(containerCount !== undefined
            ? { containerCount: Number(containerCount) || 1 }
            : {}),
          ...(trimmedContainerType !== undefined
            ? { containerType: trimmedContainerType }
            : {}),
          ...(nextStatus !== "COMPLETED"
            ? { paymentStatus: null }
            : paymentStatus !== undefined
            ? { paymentStatus: paymentStatus?.trim() || null }
            : {}),
          ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
          ...(orderDate !== undefined ? { orderDate: new Date(orderDate) } : {}),
          totalAmount,
        },
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              companyName: true,
              countryRegion: true,
              portOfDestination: true,
            },
          },
          salesRep: { select: { id: true, name: true, role: true } },
          items: {
            include: {
              product: {
                select: ORDER_ITEM_PRODUCT_SELECT,
              },
            },
          },
          payments: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ITEM") {
      return NextResponse.json(
        { error: "Sản phẩm, sản lượng (> 0) hoặc đơn giá không hợp lệ." },
        { status: 400 }
      );
    }
    console.error("PATCH /api/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật đơn hàng." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await prisma.order.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng." },
        { status: 404 }
      );
    }

    if (
      !isSalesAdminOrAbove(currentUser.role) &&
      existing.salesRepId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa đơn hàng này." },
        { status: 403 }
      );
    }

    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể xóa đơn hàng." },
      { status: 500 }
    );
  }
}
