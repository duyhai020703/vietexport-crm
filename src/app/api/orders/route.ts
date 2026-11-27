import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";

async function generateNextOrderCode(orderDate: Date): Promise<string> {
  const year = orderDate.getFullYear();
  const month = String(orderDate.getMonth() + 1).padStart(2, "0");
  const prefix = `ORD-${year}${month}-`;

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

    const where: Prisma.OrderWhereInput = {};

    if (!isManagerOrAdmin(currentUser.role)) {
      where.salesRepId = currentUser.id;
    } else if (salesRepIdParam && salesRepIdParam !== "ALL") {
      where.salesRepId = salesRepIdParam;
    }

    if (status && status !== "ALL") {
      where.status = status as OrderStatus;
    }

    if (search) {
      where.OR = [
        { orderCode: { contains: search, mode: "insensitive" } },
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
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
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

interface OrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
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
      orderDate,
      status = "QUOTED",
      notes,
      items = [],
    } = body as {
      customerId?: string;
      orderDate?: string;
      status?: OrderStatus;
      notes?: string;
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
      customer.salesRepId !== currentUser.id
    ) {
      return NextResponse.json(
        { error: "Bạn không phụ trách khách hàng này." },
        { status: 403 }
      );
    }

    const parsedDate = orderDate ? new Date(orderDate) : new Date();
    const orderCode = await generateNextOrderCode(parsedDate);

    const preparedItems = items.map((item) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      if (!item.productId || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        throw new Error("INVALID_ITEM");
      }
      return {
        productId: item.productId,
        quantity: qty,
        unitPrice: price,
        subtotal: Number((qty * price).toFixed(2)),
      };
    });

    const totalAmount = Number(
      preparedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
    );

    const order = await prisma.order.create({
      data: {
        orderCode,
        customerId,
        salesRepId: customer.salesRepId,
        orderDate: parsedDate,
        status,
        totalAmount,
        notes: notes?.trim() || null,
        items: {
          create: preparedItems,
        },
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
              select: { id: true, sku: true, name: true, unit: true },
            },
          },
        },
      },
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

