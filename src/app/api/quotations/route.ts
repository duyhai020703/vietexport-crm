import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSalesAdminOrAbove } from "@/lib/auth";
import type {
  Incoterm,
  OrderType,
  Prisma,
  SpecsCheckStatus,
} from "@/generated/prisma/client";

async function generateNextQuoteCode(): Promise<string> {
  const year2 = String(new Date().getFullYear()).slice(-2);
  const prefix = `QT-${year2}`;
  const existing = await prisma.quotation.findMany({
    where: { quoteCode: { startsWith: prefix } },
    select: { quoteCode: true },
  });

  let maxNum = 0;
  for (const q of existing) {
    const suffix = q.quoteCode.slice(prefix.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }
  return `${prefix}${String(maxNum + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const approvalStatus = searchParams.get("approvalStatus")?.trim();

    const where: Prisma.QuotationWhereInput = {};
    if (!isSalesAdminOrAbove(currentUser.role)) {
      where.salesRepId = currentUser.id;
    }
    if (approvalStatus && approvalStatus !== "ALL") {
      where.approvalStatus = approvalStatus as Prisma.EnumQuoteApprovalStatusFilter;
    }
    if (search) {
      where.OR = [
        { quoteCode: { contains: search, mode: "insensitive" } },
        { customer: { companyName: { contains: search, mode: "insensitive" } } },
        { specsNotes: { contains: search, mode: "insensitive" } },
      ];
    }

    const quotations = await prisma.quotation.findMany({
      where,
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
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json({ quotations });
  } catch (error) {
    console.error("GET /api/quotations error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách báo giá." },
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
      baseQuoteCode,
      customerId,
      quoteType = "STANDARD",
      incoterm = "FOB",
      portName,
      exchangeRate = 25400,
      targetPrice,
      packagingCost = 0,
      testingCost = 0,
      localCharges = 0,
      seaFreight = 0,
      marginPercent = 18,
      specsNotes,
      specsCheckStatus,
      moq,
      leadTimeDays,
      items = [],
    } = body as {
      baseQuoteCode?: string;
      customerId?: string;
      quoteType?: OrderType;
      incoterm?: Incoterm;
      portName?: string;
      exchangeRate?: number;
      targetPrice?: number | null;
      packagingCost?: number;
      testingCost?: number;
      localCharges?: number;
      seaFreight?: number;
      marginPercent?: number;
      specsNotes?: string;
      specsCheckStatus?: SpecsCheckStatus;
      moq?: string;
      leadTimeDays?: number | null;
      items?: { productId: string; quantity: number; unitPrice: number }[];
    };

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Vui lòng chọn khách hàng và ít nhất 1 mã sản phẩm." },
        { status: 400 }
      );
    }

    let quoteCode = baseQuoteCode?.trim();
    let version = 1;

    if (quoteCode) {
      const latest = await prisma.quotation.findFirst({
        where: { quoteCode },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      version = (latest?.version ?? 0) + 1;
    } else {
      quoteCode = await generateNextQuoteCode();
    }

    // Fetch product minMarginPercent to determine approval lock
    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const minRequiredMargin = dbProducts.reduce(
      (max, p) => Math.max(max, p.minMarginPercent),
      15
    );

    const preparedItems = items.map((item) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      return {
        productId: item.productId,
        quantity: qty,
        unitPrice: price,
        subtotal: Number((qty * price).toFixed(2)),
      };
    });

    const itemsTotal = preparedItems.reduce((sum, i) => sum + i.subtotal, 0);
    const extraCosts =
      Number(packagingCost || 0) +
      Number(testingCost || 0) +
      Number(localCharges || 0) +
      Number(seaFreight || 0);
    const totalAmount = Number((itemsTotal + extraCosts).toFixed(2));

    const numericMargin = Number(marginPercent);
    const needsApproval =
      quoteType === "OEM" || numericMargin < minRequiredMargin;

    const approvalStatus = needsApproval ? "PENDING_APPROVAL" : "AUTO_APPROVED";

    const quotation = await prisma.quotation.create({
      data: {
        quoteCode,
        version,
        customerId,
        salesRepId: currentUser.id,
        quoteType,
        incoterm,
        portName: portName?.trim() || null,
        exchangeRate: Number(exchangeRate) || 25400,
        targetPrice:
          targetPrice !== undefined && targetPrice !== null
            ? Number(targetPrice)
            : null,
        packagingCost: Number(packagingCost) || 0,
        testingCost: Number(testingCost) || 0,
        localCharges: Number(localCharges) || 0,
        seaFreight: Number(seaFreight) || 0,
        marginPercent: numericMargin,
        totalAmount,
        specsNotes: specsNotes?.trim() || null,
        specsCheckStatus:
          specsCheckStatus ??
          (quoteType === "OEM" ? "PENDING" : "NOT_REQUIRED"),
        moq: moq?.trim() || null,
        leadTimeDays:
          leadTimeDays !== undefined && leadTimeDays !== null
            ? Number(leadTimeDays)
            : null,
        approvalStatus,
        items: { create: preparedItems },
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

    return NextResponse.json({ quotation }, { status: 201 });
  } catch (error) {
    console.error("POST /api/quotations error:", error);
    return NextResponse.json(
      { error: "Không thể tạo phiếu báo giá." },
      { status: 500 }
    );
  }
}

