import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSalesAdminOrAbove } from "@/lib/auth";
import { calculateTons, PIPELINE_STAGES } from "@/lib/constants";
import type { OrderType, Prisma } from "@/generated/prisma/client";

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
    const dateMode = searchParams.get("dateMode") === "ETD" ? "ETD" : "ORDER_DATE";
    const orderType = searchParams.get("orderType")?.trim();

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 1, 0, 0, 0, 0);

    const customerWhere: Prisma.CustomerWhereInput = {};
    const orderWhere: Prisma.OrderWhereInput = {
      status: { not: "QUOTED" },
      ...(dateMode === "ETD"
        ? { etd: { gte: startDate, lt: endDate } }
        : { orderDate: { gte: startDate, lt: endDate } }),
    };

    if (orderType && orderType !== "ALL") {
      orderWhere.orderType = orderType as OrderType;
    }

    if (!isSalesAdminOrAbove(currentUser.role)) {
      customerWhere.salesRepId = currentUser.id;
      orderWhere.salesRepId = currentUser.id;
    } else if (salesRepIdParam && salesRepIdParam !== "ALL") {
      customerWhere.salesRepId = salesRepIdParam;
      orderWhere.salesRepId = salesRepIdParam;
    }

    const [customers, monthlyOrders, allActiveDebtOrders] = await Promise.all([
      prisma.customer.findMany({
        where: customerWhere,
        select: {
          id: true,
          pipelineStage: true,
          countryRegion: true,
          lostReason: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: orderWhere,
        include: {
          customer: { select: { countryRegion: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  unit: true,
                  netWeightGrams: true,
                  packsPerCarton: true,
                },
              },
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          status: { not: "QUOTED" },
          ...(isSalesAdminOrAbove(currentUser.role)
            ? salesRepIdParam && salesRepIdParam !== "ALL"
              ? { salesRepId: salesRepIdParam }
              : {}
            : { salesRepId: currentUser.id }),
        },
        select: { totalAmount: true, paidAmount: true },
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
    const totalContainers = Number(
      monthlyOrders.reduce((sum, o) => sum + o.containerCount, 0).toFixed(1)
    );
    const totalUnpaidDebt = Number(
      allActiveDebtOrders
        .reduce((sum, o) => sum + Math.max(0, o.totalAmount - o.paidAmount), 0)
        .toFixed(2)
    );

    let totalTons = 0;

    // Aggregate SKU stats (with Tons conversion per BRD formula)
    const skuMap = new Map<
      string,
      {
        productId: string;
        sku: string;
        name: string;
        unit: string;
        totalQuantity: number;
        totalTons: number;
        totalRevenue: number;
        orderIds: Set<string>;
      }
    >();

    // Country revenue & tons ranking
    const countryOrderMap = new Map<
      string,
      { countryRegion: string; orderCount: number; totalTons: number; totalRevenue: number }
    >();

    for (const order of monthlyOrders) {
      let orderTons = 0;
      for (const item of order.items) {
        const tons = calculateTons(
          item.product.netWeightGrams,
          item.product.packsPerCarton,
          item.quantity
        );
        orderTons += tons;
        totalTons += tons;

        const existing = skuMap.get(item.productId);
        if (existing) {
          existing.totalQuantity += item.quantity;
          existing.totalTons += tons;
          existing.totalRevenue += item.subtotal;
          existing.orderIds.add(order.id);
        } else {
          skuMap.set(item.productId, {
            productId: item.productId,
            sku: item.product.sku,
            name: item.product.name,
            unit: item.product.unit,
            totalQuantity: item.quantity,
            totalTons: tons,
            totalRevenue: item.subtotal,
            orderIds: new Set([order.id]),
          });
        }
      }

      const cName = order.customer.countryRegion;
      const cEntry = countryOrderMap.get(cName);
      if (cEntry) {
        cEntry.orderCount += 1;
        cEntry.totalTons += orderTons;
        cEntry.totalRevenue += order.totalAmount;
      } else {
        countryOrderMap.set(cName, {
          countryRegion: cName,
          orderCount: 1,
          totalTons: orderTons,
          totalRevenue: order.totalAmount,
        });
      }
    }

    const skuStats = Array.from(skuMap.values())
      .map((s) => ({
        productId: s.productId,
        sku: s.sku,
        name: s.name,
        unit: s.unit,
        totalQuantity: Number(s.totalQuantity.toFixed(2)),
        totalTons: Number(s.totalTons.toFixed(2)),
        totalRevenue: Number(s.totalRevenue.toFixed(2)),
        orderCount: s.orderIds.size,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const countryRanking = Array.from(countryOrderMap.values())
      .map((c) => ({
        ...c,
        totalTons: Number(c.totalTons.toFixed(2)),
        totalRevenue: Number(c.totalRevenue.toFixed(2)),
        sharePercent:
          monthlyRevenue > 0
            ? Number(((c.totalRevenue / monthlyRevenue) * 100).toFixed(1))
            : 0,
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

    // Customer count by country + Lost Reason distribution
    const countryMap = new Map<string, number>();
    const lostMap = new Map<string, number>();
    for (const c of customers) {
      countryMap.set(
        c.countryRegion,
        (countryMap.get(c.countryRegion) ?? 0) + 1
      );
      if (c.pipelineStage === "LOST" && c.lostReason) {
        const key = c.lostReason.split("(")[0].trim();
        lostMap.set(key, (lostMap.get(key) ?? 0) + 1);
      }
    }

    const countryDistribution = Array.from(countryMap.entries())
      .map(([countryRegion, count]) => ({ countryRegion, count }))
      .sort((a, b) => b.count - a.count);

    const lostReasonDistribution = Array.from(lostMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      kpis: {
        newCustomersCount,
        totalCustomersCount,
        wonCustomersCount,
        conversionRate,
        monthlyRevenue,
        monthlyOrdersCount: monthlyOrders.length,
        totalTons: Number(totalTons.toFixed(2)),
        totalContainers,
        totalUnpaidDebt,
      },
      skuStats,
      countryRanking,
      pipelineDistribution,
      countryDistribution,
      lostReasonDistribution,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "Không thể tải dữ liệu báo cáo." },
      { status: 500 }
    );
  }
}
