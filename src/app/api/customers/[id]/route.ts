import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import type {
  CustomerChannel,
  CustomerSource,
  PipelineStage,
} from "@/generated/prisma/client";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesRep: { select: { id: true, name: true, email: true, role: true } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        activities: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
        stageHistories: {
          orderBy: { changedAt: "desc" },
          include: { changedBy: { select: { id: true, name: true } } },
        },
        orders: {
          orderBy: { orderDate: "desc" },
          include: {
            items: { include: { product: true } },
          },
        },
      },
    });

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
        { error: "Bạn không có quyền xem khách hàng này." },
        { status: 403 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("GET /api/customers/[id] error:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải chi tiết khách hàng." },
      { status: 500 }
    );
  }
}

interface ContactInput {
  name: string;
  position?: string;
  email?: string;
  phoneWhatsAppWeChat?: string;
  isPrimary?: boolean;
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
    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy khách hàng." },
        { status: 404 }
      );
    }

    if (
      !isManagerOrAdmin(currentUser.role) &&
      existing.salesRepId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Bạn không có quyền chỉnh sửa khách hàng này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      companyName,
      countryRegion,
      portOfDestination,
      channel,
      source,
      salesRepId,
      pipelineStage,
      lostReason,
      contacts,
    } = body as {
      companyName?: string;
      countryRegion?: string;
      portOfDestination?: string | null;
      channel?: CustomerChannel;
      source?: CustomerSource;
      salesRepId?: string;
      pipelineStage?: PipelineStage;
      lostReason?: string | null;
      contacts?: ContactInput[];
    };

    // Re-assign check
    if (
      salesRepId &&
      salesRepId !== existing.salesRepId &&
      !isManagerOrAdmin(currentUser.role)
    ) {
      return NextResponse.json(
        { error: "Chỉ Manager hoặc Admin mới có quyền chuyển giao khách hàng." },
        { status: 403 }
      );
    }

    const nextStage = pipelineStage ?? existing.pipelineStage;
    const nextLostReason =
      lostReason !== undefined ? lostReason : existing.lostReason;

    if (nextStage === "LOST" && !nextLostReason?.trim()) {
      return NextResponse.json(
        { error: "Bắt buộc nhập Lý do trượt (Lost Reason) khi chuyển sang Lost." },
        { status: 400 }
      );
    }

    if (companyName && companyName.trim().toLowerCase() !== existing.companyName.toLowerCase()) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          companyName: { equals: companyName.trim(), mode: "insensitive" },
          id: { not: id },
        },
        select: { id: true, customerCode: true, companyName: true },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error: `Công ty "${duplicate.companyName}" đã tồn tại (${duplicate.customerCode}).`,
            duplicate,
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(contacts)) {
        await tx.customerContact.deleteMany({ where: { customerId: id } });
        const validContacts = contacts
          .filter((c) => c.name?.trim())
          .map((c, idx) => ({
            customerId: id,
            name: c.name.trim(),
            position: c.position?.trim() || null,
            email: c.email?.trim() || null,
            phoneWhatsAppWeChat: c.phoneWhatsAppWeChat?.trim() || null,
            isPrimary: Boolean(c.isPrimary ?? idx === 0),
          }));

        if (validContacts.length > 0) {
          await tx.customerContact.createMany({ data: validContacts });
        }
      }

      const stageChanged =
        pipelineStage !== undefined && pipelineStage !== existing.pipelineStage;

      if (stageChanged) {
        await tx.customerStageHistory.create({
          data: {
            customerId: id,
            fromStage: existing.pipelineStage,
            toStage: pipelineStage!,
            changedById: currentUser.id,
            note:
              pipelineStage === "LOST" ? nextLostReason?.trim() || null : null,
          },
        });
      }

      return tx.customer.update({
        where: { id },
        data: {
          ...(companyName !== undefined ? { companyName: companyName.trim() } : {}),
          ...(countryRegion !== undefined ? { countryRegion: countryRegion.trim() } : {}),
          ...(portOfDestination !== undefined
            ? { portOfDestination: portOfDestination?.trim() || null }
            : {}),
          ...(channel !== undefined ? { channel } : {}),
          ...(source !== undefined ? { source } : {}),
          ...(salesRepId !== undefined && isManagerOrAdmin(currentUser.role)
            ? { salesRepId }
            : {}),
          ...(pipelineStage !== undefined ? { pipelineStage } : {}),
          ...(stageChanged ? { stageChangedAt: new Date() } : {}),
          lastActivityAt: new Date(),
          lostReason:
            nextStage === "LOST" ? nextLostReason?.trim() || null : null,
        },
        include: {
          salesRep: { select: { id: true, name: true, email: true, role: true } },
          contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { user: { select: { id: true, name: true } } },
          },
          stageHistories: {
            orderBy: { changedAt: "desc" },
            take: 10,
            include: { changedBy: { select: { id: true, name: true } } },
          },
          _count: { select: { orders: true, quotations: true } },
        },
      });
    });

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error("PATCH /api/customers/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật thông tin khách hàng." },
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
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy khách hàng." },
        { status: 404 }
      );
    }

    // BRD: Sale Export không có quyền xóa dữ liệu khách hàng (chỉ Trưởng phòng/Admin)
    if (!isManagerOrAdmin(currentUser.role)) {
      return NextResponse.json(
        { error: "Theo quy định BRD, Sale không có quyền xóa khách hàng. Chỉ Trưởng phòng/Admin mới được xóa." },
        { status: 403 }
      );
    }

    if (existing._count.orders > 0) {
      return NextResponse.json(
        { error: "Không thể xóa khách hàng đã có đơn hàng phát sinh." },
        { status: 400 }
      );
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/customers/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể xóa khách hàng." },
      { status: 500 }
    );
  }
}

