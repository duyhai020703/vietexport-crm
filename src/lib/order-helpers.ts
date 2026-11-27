export interface OrderItemInput {
  productId: string;
  category?: string | null;
  specification?: string | null;
  unit?: string | null;
  quantity: number;
  weightKg?: number | null;
  market?: string | null;
  deliveryDate?: string | null;
  unitPrice: number;
}

export const ORDER_ITEM_PRODUCT_SELECT = {
  id: true,
  sku: true,
  name: true,
  category: true,
  specification: true,
  unit: true,
  netWeightGrams: true,
  packsPerCarton: true,
} as const;

export function prepareOrderItems(items: OrderItemInput[]) {
  return items.map((item) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    if (
      !item.productId ||
      isNaN(qty) ||
      qty <= 0 ||
      isNaN(price) ||
      price < 0
    ) {
      throw new Error("INVALID_ITEM");
    }

    const weightVal =
      item.weightKg !== undefined &&
      item.weightKg !== null &&
      String(item.weightKg) !== ""
        ? Number(item.weightKg)
        : null;

    if (weightVal !== null && (isNaN(weightVal) || weightVal < 0)) {
      throw new Error("INVALID_ITEM");
    }

    return {
      productId: item.productId,
      category: item.category?.trim() || null,
      specification: item.specification?.trim() || null,
      unit: item.unit?.trim() || null,
      quantity: qty,
      weightKg: weightVal,
      market: item.market?.trim() || null,
      deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
      unitPrice: price,
      subtotal: Number((qty * price).toFixed(2)),
    };
  });
}

