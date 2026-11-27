import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyName = searchParams.get("companyName")?.trim();
    const excludeId = searchParams.get("excludeId")?.trim();

    if (!companyName) {
      return NextResponse.json({ exists: false });
    }

    const existing = await prisma.customer.findFirst({
      where: {
        companyName: {
          equals: companyName,
          mode: "insensitive",
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        customerCode: true,
        companyName: true,
        salesRep: {
          select: { name: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      match: {
        id: existing.id,
        customerCode: existing.customerCode,
        companyName: existing.companyName,
        salesRepName: existing.salesRep.name,
      },
    });
  } catch (error) {
    console.error("GET /api/customers/check-duplicate error:", error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}

