import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import type {
  CustomerChannel,
  CustomerSource,
  PipelineStage,
  Prisma,
} from "@/generated/prisma/client";

async function generateNextCustomerCode(): Promise<string> {
  const customers = await prisma.customer.findMany({
    select: { customerCode: true },
    orderBy: { customerCode: "desc" },
    take: 20,
  });

  let maxNum = 0;
  for (const c of customers) {
    const match = c.customerCode.match(/^CUS-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `CUS-${String(maxNum + 1).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Chưa có dữ liệu nhân viên trong hệ thống." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const countryRegion = searchParams.get("countryRegion")?.trim();
    const portOfDestination = searchParams.get("portOfDestination")?.trim();
    const channel = searchParams.get("channel")?.trim();
    const pipelineStage = searchParams.get("pipelineStage")?.trim();
    const salesRepIdParam = searchParams.get("salesRepId")?.trim();

    const where: Prisma.CustomerWhereInput = {};

    // Phân quyền: SALE chỉ xem khách hàng mình phụ trách
    if (!isManagerOrAdmin(currentUser.role)) {
      where.salesRepId = currentUser.id;
    } else if (salesRepIdParam && salesRepIdParam !== "ALL") {
      where.salesRepId = salesRepIdParam;
    }

    if (countryRegion && countryRegion !== "ALL") {
      where.countryRegion = { contains: countryRegion, mode: "insensitive" };
    }

    if (portOfDestination && portOfDestination !== "ALL") {
      where.portOfDestination = {
        contains: portOfDestination,
        mode: "insensitive",
      };
    }

    if (channel && channel !== "ALL") {
      where.channel = channel as CustomerChannel;
    }

    if (pipelineStage && pipelineStage !== "ALL") {
      where.pipelineStage = pipelineStage as PipelineStage;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { customerCode: { contains: search, mode: "insensitive" } },
        { countryRegion: { contains: search, mode: "insensitive" } },
        { portOfDestination: { contains: search, mode: "insensitive" } },
        {
          contacts: {
            some: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
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
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách khách hàng." },
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

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Chưa xác định nhân viên đăng nhập." },
        { status: 401 }
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
      pipelineStage = "NEW_LEAD",
      lostReason,
      contacts = [],
    } = body as {
      companyName?: string;
      countryRegion?: string;
      portOfDestination?: string;
      channel?: CustomerChannel;
      source?: CustomerSource;
      salesRepId?: string;
      pipelineStage?: PipelineStage;
      lostReason?: string;
      contacts?: ContactInput[];
    };

    if (!companyName?.trim() || !countryRegion?.trim() || !channel || !source) {
      return NextResponse.json(
        {
          error:
            "Vui lòng nhập đầy đủ Tên công ty, Quốc gia/Khu vực, Phân loại và Nguồn khách.",
        },
        { status: 400 }
      );
    }

    if (pipelineStage === "LOST" && !lostReason?.trim()) {
      return NextResponse.json(
        { error: "Bắt buộc nhập Lý do trượt (Lost Reason) khi trạng thái là Lost." },
        { status: 400 }
      );
    }

    // Duplicate check
    const duplicate = await prisma.customer.findFirst({
      where: {
        companyName: { equals: companyName.trim(), mode: "insensitive" },
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

    const assignedSalesRepId =
      isManagerOrAdmin(currentUser.role) && salesRepId
        ? salesRepId
        : currentUser.id;

    const customerCode = await generateNextCustomerCode();

    const validContacts = contacts
      .filter((c) => c.name?.trim())
      .map((c, idx) => ({
        name: c.name.trim(),
        position: c.position?.trim() || null,
        email: c.email?.trim() || null,
        phoneWhatsAppWeChat: c.phoneWhatsAppWeChat?.trim() || null,
        isPrimary: Boolean(c.isPrimary ?? idx === 0),
      }));

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        companyName: companyName.trim(),
        countryRegion: countryRegion.trim(),
        portOfDestination: portOfDestination?.trim() || null,
        channel,
        source,
        salesRepId: assignedSalesRepId,
        pipelineStage,
        stageChangedAt: new Date(),
        lostReason: pipelineStage === "LOST" ? lostReason?.trim() : null,
        contacts: {
          create: validContacts,
        },
        stageHistories: {
          create: {
            fromStage: null,
            toStage: pipelineStage,
            changedById: currentUser.id,
            note: pipelineStage === "LOST" ? lostReason?.trim() : null,
          },
        },
      },
      include: {
        salesRep: { select: { id: true, name: true, email: true, role: true } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        stageHistories: {
          orderBy: { changedAt: "desc" },
          include: { changedBy: { select: { id: true, name: true } } },
        },
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json(
      { error: "Không thể tạo khách hàng mới." },
      { status: 500 }
    );
  }
}

