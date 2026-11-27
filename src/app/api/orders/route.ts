import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  isManagerOrAdmin,
  isSalesAdminOrAbove,
} from "@/lib/auth";
import {
  ORDER_ITEM_PRODUCT_SELECT,
  prepareOrderItems,
  type OrderItemInput,
} from "@/lib/order-helpers";
import type {
  Incoterm,
  OrderStatus,
  OrderType,
  Prisma,
} from "@/generated/prisma/client";

async function generateNextOrderCode(orderDate: Date): Promise<string> {
  const year2 = String(orderDate.getFullYear()).slice(-2);
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

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status")?.trim();
    const salesRepIdParam = searchParams.get("salesRepId")?.trim();
    const customerIdParam = searchParams.get("customerId")?.trim();

    const where: Prisma.OrderWhereInput = {};

    // BRD: Sales Admin, Manager, Admin xem toàn bộ đơn hàng; Sale xem đơn của mình
    if (!isSalesAdminOrAbove(currentUser.role)) {
      where.salesRepId = currentUser.id;
    } else if (salesRepIdParam && salesRepIdParam !== "ALL") {
      where.salesRepId = salesRepIdParam;
    }

    if (customerIdParam) {
      where.customerId = customerIdParam;
    }

    if (status && status !== "ALL") {
      where.status = status as OrderStatus;
    }

    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: "insensitive" } },
        { poNumber: { contains: search, mode: "insensitive" } },
        { customer: { companyName: { contains: search, mode: "insensitive" } } },
        { customer: { customerCode: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
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
        payments: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách đơn hàng." },
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

    const body = await req.json();
    const {
      customerId,
      poNumber,
      productionOrderNo,
      orderType = "STANDARD",
      incoterm = "FOB",
      orderDate,
      contractDate,
      estProductionDate,
      etd,
      eta,
      containerCount = 1,
      containerType,
      status = "CONFIRMED",
      paymentStatus,
      notes,
      items = [],
    } = body as {
      customerId?: string;
      poNumber?: string;
      productionOrderNo?: string | null;
      orderType?: OrderType;
      incoterm?: Incoterm;
      orderDate?: string;
      contractDate?: string;
      estProductionDate?: string;
      etd?: string;
      eta?: string;
      containerCount?: number;
      containerType?: string | null;
      status?: OrderStatus;
      paymentStatus?: string | null;
      notes?: string | null;
      items?: OrderItemInput[];
    };

    if (!customerId) {
      return NextResponse.json(
        { error: "Vui lòng chọn khách hàng." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Đơn hàng phải có ít nhất 1 sản phẩm." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Khách hàng không tồn tại." },
        { status: 404 }
      );
    }

    if (
      !isManagerOrAdmin(currentUser.role) &&
      !isSalesAdminOrAbove(currentUser.role) &&
      customer.salesRepId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Bạn không phụ trách khách hàng này." },
        { status: 403 }
      );
    }

    const parsedDate = orderDate ? new Date(orderDate) : new Date();
    const orderCode = await generateNextOrderCode(parsedDate);

    const preparedItems = prepareOrderItems(items);

    const totalAmount = Number(
      preparedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
    );

    const trimmedContainerType = containerType?.trim() || null;

    const order = await prisma.$transaction(async (tx) => {
      if (trimmedContainerType) {
        await tx.containerType.upsert({
          where: { name: trimmedContainerType },
          update: {},
          create: { name: trimmedContainerType },
        });
      }

      return tx.order.create({
        data: {
          orderCode,
          poNumber: poNumber?.trim() || null,
          productionOrderNo: productionOrderNo?.trim() || null,
          customerId,
          salesRepId: customer.salesRepId,
          orderType,
          incoterm,
          orderDate: parsedDate,
          contractDate: contractDate ? new Date(contractDate) : parsedDate,
          estProductionDate: estProductionDate ? new Date(estProductionDate) : null,
          etd: etd ? new Date(etd) : null,
          eta: eta ? new Date(eta) : null,
          containerCount: Number(containerCount) || 1,
          containerType: trimmedContainerType,
          status,
          paymentStatus:
            status === "COMPLETED" ? paymentStatus?.trim() || null : null,
          totalAmount,
          notes: notes?.trim() || null,
          items: { create: preparedItems },
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
          payments: true,
        },
      });
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_ITEM") {
      return NextResponse.json(
        { error: "Sản phẩm, sản lượng (> 0) hoặc đơn giá không hợp lệ." },
        { status: 400 }
      );
    }
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { error: "Không thể tạo đơn hàng mới." },
      { status: 500 }
    );
  }
}
