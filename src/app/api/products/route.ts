import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    const rawProducts = await prisma.product.findMany({
      where: search
        ? {
            OR: [
              { sku: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { specification: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { sku: "asc" },
    });

    // BRD: Chỉ Trưởng phòng (Admin/Manager) được thấy giá vốn/giá sàn
    const canSeeCost = currentUser ? isManagerOrAdmin(currentUser.role) : false;
    const products = rawProducts.map((p) => {
      if (canSeeCost) return p;
      const { costPrice: _hidden, ...rest } = p;
      void _hidden;
      return rest;
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
    const {
      sku,
      name,
      englishName,
      category,
      specification,
      unit,
      netWeightGrams = 300,
      packsPerCarton = 40,
      cartonDimensions,
      cbm,
      capacity20ft,
      capacity40hc,
      costPrice = 0,
      minMarginPercent = 15,
      basePrice = 0,
    } = body as {
      sku?: string;
      name?: string;
      englishName?: string;
      category?: string;
      specification?: string;
      unit?: string;
      netWeightGrams?: number;
      packsPerCarton?: number;
      cartonDimensions?: string;
      cbm?: number | null;
      capacity20ft?: number | null;
      capacity40hc?: number | null;
      costPrice?: number;
      minMarginPercent?: number;
      basePrice?: number;
    };

    if (!sku?.trim() || !name?.trim() || !unit?.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Mã SKU, Tên sản phẩm và Đơn vị tính." },
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
        englishName: englishName?.trim() || null,
        category: category?.trim() || null,
        specification: specification?.trim() || null,
        unit: unit.trim(),
        netWeightGrams: Number(netWeightGrams) || 300,
        packsPerCarton: Number(packsPerCarton) || 40,
        cartonDimensions: cartonDimensions?.trim() || null,
        cbm: cbm !== undefined && cbm !== null ? Number(cbm) : null,
        capacity20ft:
          capacity20ft !== undefined && capacity20ft !== null
            ? Number(capacity20ft)
            : null,
        capacity40hc:
          capacity40hc !== undefined && capacity40hc !== null
            ? Number(capacity40hc)
            : null,
        costPrice: Number(costPrice) || 0,
        minMarginPercent: Number(minMarginPercent) || 15,
        basePrice: Number(basePrice) || 0,
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
