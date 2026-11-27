import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    const products = await prisma.product.findMany({
      where: search
        ? {
            OR: [
              { sku: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { specification: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { sku: "asc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh mục sản phẩm." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku, name, specification, unit, basePrice } = body as {
      sku?: string;
      name?: string;
      specification?: string;
      unit?: string;
      basePrice?: number;
    };

    if (!sku?.trim() || !name?.trim() || !unit?.trim() || basePrice === undefined) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Mã SKU, Tên sản phẩm, Đơn vị tính và Đơn giá." },
        { status: 400 }
      );
    }

    const existingSku = await prisma.product.findUnique({
      where: { sku: sku.trim().toUpperCase() },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: `Mã SKU "${existingSku.sku}" đã tồn tại.` },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        specification: specification?.trim() || null,
        unit: unit.trim(),
        basePrice: Number(basePrice),
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json(
      { error: "Không thể tạo sản phẩm mới." },
      { status: 500 }
    );
  }
}

