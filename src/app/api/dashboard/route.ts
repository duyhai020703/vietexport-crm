import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import { PIPELINE_STAGES } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = Number(searchParams.get("month") || now.getMonth() + 1);
    const year = Number(searchParams.get("year") || now.getFullYear());
    const salesRepIdParam = searchParams.get("salesRepId")?.trim();

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 1, 0, 0, 0, 0);

    const customerWhere: Prisma.CustomerWhereInput = {};
    const orderWhere: Prisma.OrderWhereInput = {
      orderDate: {
        gte: startDate,
        lt: endDate,
      },
    };

    if (!isManagerOrAdmin(currentUser.role)) {
      customerWhere.salesRepId = currentUser.id;
      orderWhere.salesRepId = currentUser.id;
    } else if (salesRepIdParam && salesRepIdParam !== "ALL") {
      customerWhere.salesRepId = salesRepIdParam;
      orderWhere.salesRepId = salesRepIdParam;
    }

    const [customers, monthlyOrders] = await Promise.all([
      prisma.customer.findMany({
        where: customerWhere,
        select: {
          id: true,
          pipelineStage: true,
          countryRegion: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: {
          ...orderWhere,
          status: { in: ["CONFIRMED", "SHIPPED", "COMPLETED"] },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, sku: true, name: true, unit: true },
              },
            },
          },
        },
      }),
    ]);

    const newCustomersCount = customers.filter(
      (c) => c.createdAt >= startDate && c.createdAt < endDate
    ).length;

    const totalCustomersCount = customers.length;
    const wonCustomersCount = customers.filter(
      (c) => c.pipelineStage === "ACTIVE_WON"
    ).length;

    const conversionRate =
      totalCustomersCount > 0
        ? Number(((wonCustomersCount / totalCustomersCount) * 100).toFixed(1))
        : 0;

    const monthlyRevenue = Number(
      monthlyOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)
    );

    // Aggregate SKU stats from successful orders in the selected month
    const skuMap = new Map<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        unit: string;
        totalQuantity: number;
        totalRevenue: number;
        orderIds: Set<string>;
      }
    >();

    for (const order of monthlyOrders) {
      for (const item of order.items) {
        const existing = skuMap.get(item.productId);
        if (existing) {
          existing.totalQuantity += item.quantity;
          existing.totalRevenue += item.subtotal;
          existing.orderIds.add(order.id);
        } else {
          skuMap.set(item.productId, {
            productId: item.productId,
            sku: item.product.sku,
            name: item.product.name,
            unit: item.product.unit,
            totalQuantity: item.quantity,
            totalRevenue: item.subtotal,
            orderIds: new Set([order.id]),
          });
        }
      }
    }

    const skuStats = Array.from(skuMap.values())
      .map((s) => ({
        productId: s.productId,
        sku: s.sku,
        name: s.name,
        unit: s.unit,
        totalQuantity: Number(s.totalQuantity.toFixed(2)),
        totalRevenue: Number(s.totalRevenue.toFixed(2)),
        orderCount: s.orderIds.size,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Pipeline distribution across all 9 stages
    const pipelineMap = new Map<string, number>();
    for (const st of PIPELINE_STAGES) {
      pipelineMap.set(st.key, 0);
    }
    for (const c of customers) {
      pipelineMap.set(
        c.pipelineStage,
        (pipelineMap.get(c.pipelineStage) ?? 0) + 1
      );
    }
    const pipelineDistribution = PIPELINE_STAGES.map((st) => ({
      stage: st.key,
      label: st.label,
      viLabel: st.viLabel,
      count: pipelineMap.get(st.key) ?? 0,
    }));

    // Country / Region distribution
    const countryMap = new Map<string, number>();
    for (const c of customers) {
      countryMap.set(
        c.countryRegion,
        (countryMap.get(c.countryRegion) ?? 0) + 1
      );
    }
    const countryDistribution = Array.from(countryMap.entries())
      .map(([countryRegion, count]) => ({ countryRegion, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      kpis: {
        newCustomersCount,
        totalCustomersCount,
        wonCustomersCount,
        conversionRate,
        monthlyRevenue,
        monthlyOrdersCount: monthlyOrders.length,
      },
      skuStats,
      pipelineDistribution,
      countryDistribution,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "Không thể tải dữ liệu báo cáo." },
      { status: 500 }
    );
  }
}

