import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSalesAdminOrAbove } from "@/lib/auth";
import type { OrderStatus } from "@/generated/prisma/client";

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
      poNumber,
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
      notes,
      orderDate,
      items,
    } = body as {
      status?: OrderStatus;
      poNumber?: string | null;
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
      notes?: string | null;
      orderDate?: string;
      items?: { productId: string; quantity: number; unitPrice: number }[];
    };

    const parseDateOrNull = (val: string | null | undefined) => {
      if (val === undefined) return undefined;
      if (!val) return null;
      return new Date(val);
    };

    const updated = await prisma.$transaction(async (tx) => {
      let totalAmount = existing.totalAmount;

      if (Array.isArray(items) && items.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        const prepared = items.map((item) => {
          const qty = Number(item.quantity);
          const price = Number(item.unitPrice);
          return {
            orderId: id,
            productId: item.productId,
            quantity: qty,
            unitPrice: price,
            subtotal: Number((qty * price).toFixed(2)),
          };
        });
        totalAmount = Number(
          prepared.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
        );
        await tx.orderItem.createMany({ data: prepared });
      }

      return tx.order.update({
        where: { id },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(poNumber !== undefined ? { poNumber: poNumber?.trim() || null } : {}),
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
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  unit: true,
                  netWeightGrams: true,
                  packsPerCarton: true,
                },
              },
            },
          },
          payments: { orderBy: { createdAt: "asc" } },
        },
      });
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
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
