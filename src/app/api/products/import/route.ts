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

    let createdCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of products) {
        const sku = item.sku?.trim().toUpperCase();
        const name = item.name?.trim();
        if (!sku || !name) continue;

        const existing = await tx.product.findUnique({ where: { sku } });
        const commonData = {
          name,
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

        if (existing) {
          await tx.product.update({
            where: { sku },
            data: commonData,
          });
          updatedCount += 1;
        } else {
          await tx.product.create({
            data: {
              sku,
              ...commonData,
              basePrice: 0,
            },
          });
          createdCount += 1;
        }
      }
    });

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      total: createdCount + updatedCount,
    });
  } catch (error) {
    console.error("POST /api/products/import error:", error);
    return NextResponse.json(
      { error: "Không thể import danh sách sản phẩm." },
      { status: 500 }
    );
  }
}
