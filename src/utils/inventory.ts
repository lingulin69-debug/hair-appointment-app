import type { InventoryMovement, StoreItem } from '../types';

export type InventorySummary = {
  itemId: string;
  currentStock: number;
  totalStockIn: number;
  totalStockOut: number;
  lastMovementDate?: string;
};

export function buildInventorySummaryMap(
  storeItems: StoreItem[] | null | undefined,
  movements: InventoryMovement[] | null | undefined
): Record<string, InventorySummary> {
  const summaries = new Map<string, InventorySummary>();

  for (const item of Array.isArray(storeItems) ? storeItems : []) {
    if (item.type !== 'product') {
      continue;
    }

    summaries.set(item.id, {
      itemId: item.id,
      currentStock: 0,
      totalStockIn: 0,
      totalStockOut: 0,
    });
  }

  for (const movement of Array.isArray(movements) ? movements : []) {
    const existing = summaries.get(movement.itemId) ?? {
      itemId: movement.itemId,
      currentStock: 0,
      totalStockIn: 0,
      totalStockOut: 0,
    };

    if (movement.movementType === 'stock_in') {
      existing.currentStock += movement.quantity;
      existing.totalStockIn += movement.quantity;
    } else if (movement.movementType === 'stock_out') {
      existing.currentStock -= movement.quantity;
      existing.totalStockOut += movement.quantity;
    }

    if (!existing.lastMovementDate || movement.dateStr > existing.lastMovementDate) {
      existing.lastMovementDate = movement.dateStr;
    }

    summaries.set(movement.itemId, existing);
  }

  return Object.fromEntries(summaries.entries());
}