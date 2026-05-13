import { describe, expect, it } from 'vitest';
import type { InventoryMovement, StoreItem } from '../types';
import { buildInventorySummaryMap } from './inventory';

const storeItems: StoreItem[] = [
  {
    id: 'product-1',
    name: 'Care Oil',
    price: 450,
    duration: '-',
    type: 'product',
  },
  {
    id: 'service-1',
    name: 'Cut',
    price: 1200,
    duration: '60',
    type: 'service',
  },
];

const movements: InventoryMovement[] = [
  {
    id: 'mv-1',
    itemId: 'product-1',
    itemName: 'Care Oil',
    movementType: 'stock_in',
    reason: 'purchase',
    quantity: 10,
    dateStr: '2026-05-10',
  },
  {
    id: 'mv-2',
    itemId: 'product-1',
    itemName: 'Care Oil',
    movementType: 'stock_out',
    reason: 'sale',
    quantity: 3,
    dateStr: '2026-05-11',
  },
];

describe('inventory utilities', () => {
  it('builds current stock from stock in and stock out records', () => {
    const summaryMap = buildInventorySummaryMap(storeItems, movements);

    expect(summaryMap['product-1']).toEqual({
      itemId: 'product-1',
      currentStock: 7,
      totalStockIn: 10,
      totalStockOut: 3,
      lastMovementDate: '2026-05-11',
    });
  });
});