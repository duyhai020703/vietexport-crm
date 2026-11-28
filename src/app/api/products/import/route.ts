import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { ParsedExcelProduct } from "@/lib/excelProductParser";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { products } = body as { products?: ParsedExcelProduct[] };

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "Danh sách sản phẩm import trống." },
        { status: 400 }
      );
    }

    // Normalize & deduplicate by SKU
    const normalizedMap = new Map<string, ParsedExcelProduct>();
    for (const item of products) {
      const sku = item.sku?.trim().toUpperCase();
      const name = item.name?.trim();
      if (!sku || !name) continue;
      normalizedMap.set(sku, { ...item, sku, name });
    }

    const normalized = Array.from(normalizedMap.values());
    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "Không có mã SKU/Tên sản phẩm hợp lệ." },
        { status: 400 }
      );
    }

    const existingRows = await prisma.product.findMany({
      where: { sku: { in: normalized.map((i) => i.sku) } },
      select: { sku: true },
    });
    const existingSet = new Set(existingRows.map((r) => r.sku));

    const toCreate: {
      sku: string;
      name: string;
      englishName: string | null;
      category: string | null;
      specification: string | null;
      unit: string;
      netWeightGrams: number;
      packsPerCarton: number;
      cartonDimensions: string | null;
      cbm: number | null;
      capacity20ft: number | null;
      capacity40hc: number | null;
      basePrice: number;
    }[] = [];

    const toUpdate: {
      sku: string;
      data: {
        name: string;
        englishName: string | null;
        category: string | null;
        specification: string | null;
        unit: string;
        netWeightGrams: number;
        packsPerCarton: number;
        cartonDimensions: string | null;
        cbm: number | null;
        capacity20ft: number | null;
        capacity40hc: number | null;
      };
    }[] = [];

    for (const item of normalized) {
      const commonData = {
        name: item.name,
        englishName: item.englishName?.trim() || null,
        category: item.category?.trim() || null,
        specification: item.specification?.trim() || null,
        unit: item.unit?.trim() || "Thùng",
        netWeightGrams: Number(item.netWeightGrams) || 300,
        packsPerCarton: Number(item.packsPerCarton) || 40,
        cartonDimensions: item.cartonDimensions?.trim() || null,
        cbm: item.cbm !== null && item.cbm !== undefined ? Number(item.cbm) : null,
        capacity20ft:
          item.capacity20ft !== null && item.capacity20ft !== undefined
            ? Number(item.capacity20ft)
            : null,
        capacity40hc:
          item.capacity40hc !== null && item.capacity40hc !== undefined
            ? Number(item.capacity40hc)
            : null,
      };

      if (existingSet.has(item.sku)) {
        toUpdate.push({ sku: item.sku, data: commonData });
      } else {
        toCreate.push({ sku: item.sku, ...commonData, basePrice: 0 });
      }
    }

    if (toCreate.length > 0) {
      await prisma.product.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }

    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((u) =>
          prisma.product.update({
            where: { sku: u.sku },
            data: u.data,
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      createdCount: toCreate.length,
      updatedCount: toUpdate.length,
      total: toCreate.length + toUpdate.length,
    });
  } catch (error) {
    console.error("POST /api/products/import error:", error);
    const message =
      error instanceof Error ? error.message : "Không thể import danh sách sản phẩm.";
    return NextResponse.json(
      { error: `Import lỗi: ${message}` },
      { status: 500 }
    );
  }
}
