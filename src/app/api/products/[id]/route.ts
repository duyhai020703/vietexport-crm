import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const {
      sku,
      name,
      specification,
      unit,
      netWeightGrams,
      packsPerCarton,
      cartonDimensions,
      cbm,
      capacity20ft,
      capacity40hc,
      costPrice,
      minMarginPercent,
      basePrice,
    } = body as {
      sku?: string;
      name?: string;
      specification?: string | null;
      unit?: string;
      netWeightGrams?: number;
      packsPerCarton?: number;
      cartonDimensions?: string | null;
      cbm?: number | null;
      capacity20ft?: number | null;
      capacity40hc?: number | null;
      costPrice?: number;
      minMarginPercent?: number;
      basePrice?: number;
    };

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy sản phẩm." },
        { status: 404 }
      );
    }

    if (sku && sku.trim().toUpperCase() !== existing.sku) {
      const dup = await prisma.product.findUnique({
        where: { sku: sku.trim().toUpperCase() },
      });
      if (dup) {
        return NextResponse.json(
          { error: `Mã SKU "${dup.sku}" đã tồn tại.` },
          { status: 409 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(sku !== undefined ? { sku: sku.trim().toUpperCase() } : {}),
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(specification !== undefined
          ? { specification: specification?.trim() || null }
          : {}),
        ...(unit !== undefined ? { unit: unit.trim() } : {}),
        ...(netWeightGrams !== undefined
          ? { netWeightGrams: Number(netWeightGrams) }
          : {}),
        ...(packsPerCarton !== undefined
          ? { packsPerCarton: Number(packsPerCarton) }
          : {}),
        ...(cartonDimensions !== undefined
          ? { cartonDimensions: cartonDimensions?.trim() || null }
          : {}),
        ...(cbm !== undefined
          ? { cbm: cbm !== null ? Number(cbm) : null }
          : {}),
        ...(capacity20ft !== undefined
          ? { capacity20ft: capacity20ft !== null ? Number(capacity20ft) : null }
          : {}),
        ...(capacity40hc !== undefined
          ? { capacity40hc: capacity40hc !== null ? Number(capacity40hc) : null }
          : {}),
        ...(costPrice !== undefined ? { costPrice: Number(costPrice) } : {}),
        ...(minMarginPercent !== undefined
          ? { minMarginPercent: Number(minMarginPercent) }
          : {}),
        ...(basePrice !== undefined ? { basePrice: Number(basePrice) } : {}),
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("PATCH /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật sản phẩm." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const usedCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (usedCount > 0) {
      return NextResponse.json(
        { error: "Không thể xóa sản phẩm đã nằm trong đơn hàng." },
        { status: 400 }
      );
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Không thể xóa sản phẩm." },
      { status: 500 }
    );
  }
}
