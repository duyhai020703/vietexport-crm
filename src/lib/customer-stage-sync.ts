import type { OrderStatus, PipelineStage, Prisma } from "@/generated/prisma/client";

const CONFIRMED_ORDER_STATUSES = new Set<OrderStatus>([
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
]);

export function isConfirmedOrderStatus(status: OrderStatus | string): boolean {
  return CONFIRMED_ORDER_STATUSES.has(status as OrderStatus);
}

/**
 * Đồng bộ trạng thái khách hàng (pipelineStage) theo nguyên tắc High-water mark từ toàn bộ đơn hàng:
 * - Có >= 1 đơn từ CONFIRMED trở lên -> ACTIVE_WON (không bị tụt khi tạo thêm đơn QUOTED mới).
 * - Chưa có đơn CONFIRMED trở lên nhưng có đơn QUOTED -> QUOTED (giữ nguyên nếu đang NEGOTIATING).
 * - Không còn đơn nào sau khi xóa/hạ trạng thái từ ACTIVE_WON -> quay về QUOTED (nếu có báo giá) hoặc NEW_LEAD.
 */
export async function syncCustomerStageFromOrders(
  tx: Prisma.TransactionClient,
  customerId: string,
  changedById: string,
  note?: string
): Promise<void> {
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    select: {
      pipelineStage: true,
      orders: { select: { status: true } },
      _count: { select: { quotations: true } },
    },
  });

  if (!customer) return;

  const hasConfirmedOrder = customer.orders.some((o) =>
    isConfirmedOrderStatus(o.status)
  );
  const hasQuotedOrder = customer.orders.some((o) => o.status === "QUOTED");

  let targetStage: PipelineStage | null = null;

  if (hasConfirmedOrder) {
    if (customer.pipelineStage !== "ACTIVE_WON") {
      targetStage = "ACTIVE_WON";
    }
  } else if (hasQuotedOrder) {
    if (
      customer.pipelineStage === "NEW_LEAD" ||
      customer.pipelineStage === "LOST" ||
      customer.pipelineStage === "ACTIVE_WON"
    ) {
      targetStage = "QUOTED";
    }
  } else if (customer.pipelineStage === "ACTIVE_WON") {
    targetStage = customer._count.quotations > 0 ? "QUOTED" : "NEW_LEAD";
  }

  if (!targetStage || targetStage === customer.pipelineStage) return;

  const now = new Date();
  await tx.customer.update({
    where: { id: customerId },
    data: {
      pipelineStage: targetStage,
      stageChangedAt: now,
      lastActivityAt: now,
      lostReason: null,
    },
  });

  await tx.customerStageHistory.create({
    data: {
      customerId,
      fromStage: customer.pipelineStage,
      toStage: targetStage,
      changedById,
      note: note ?? "Tự động đồng bộ từ đơn hàng",
      changedAt: now,
    },
  });
}
