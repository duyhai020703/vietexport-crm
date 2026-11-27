import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CONTAINER_TYPES } from "@/lib/constants";

export async function GET() {
  try {
    const [savedTypes, orderTypes] = await Promise.all([
      prisma.containerType.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.order.findMany({
        where: { containerType: { not: null } },
        select: { containerType: true },
        distinct: ["containerType"],
      }),
    ]);

    const set = new Set<string>(DEFAULT_CONTAINER_TYPES);
    for (const t of savedTypes) {
      if (t.name.trim()) set.add(t.name.trim());
    }
    for (const o of orderTypes) {
      if (o.containerType?.trim()) set.add(o.containerType.trim());
    }

    return NextResponse.json({
      containerTypes: Array.from(set).sort((a, b) => a.localeCompare(b)),
    });
  } catch (error) {
    console.error("GET /api/container-types error:", error);
    return NextResponse.json(
      { containerTypes: [...DEFAULT_CONTAINER_TYPES] },
      { status: 200 }
    );
  }
}

