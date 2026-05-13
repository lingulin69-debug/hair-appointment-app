import { describe, expect, it } from 'vitest';
import {
  calculateCheckoutSubtotal,
  calculateCheckoutTotal,
  sanitizeCheckoutRecord,
  sanitizeInventoryMovement,
} from './transactions';

describe('transactions utilities', () => {
  it('calculates subtotal and total with discount and adjustment', () => {
    const subtotal = calculateCheckoutSubtotal([
      {
        itemName: 'Cut',
        itemType: 'service',
        quantity: 1,
        unitPrice: 1200,
      },
      {
        itemName: 'Care Oil',
        itemType: 'product',
        quantity: 2,
        unitPrice: 450,
      },
    ]);

    expect(subtotal).toBe(2100);
    expect(calculateCheckoutTotal(subtotal, 100, 50)).toBe(2050);
  });

  it('sanitizes checkout records into a stable structure', () => {
    const record = sanitizeCheckoutRecord(
      {
        clientId: ' client-1 ',
        clientName: ' Alice ',
        lineItems: [
          {
            itemName: 'Color',
            itemType: 'service',
            quantity: 1,
            unitPrice: 2800,
          },
        ],
        discountAmount: 200,
      },
      'tx-1'
    );

    expect(record.clientId).toBe('client-1');
    expect(record.clientName).toBe('Alice');
    expect(record.subtotal).toBe(2800);
    expect(record.totalAmount).toBe(2600);
    expect(record.status).toBe('completed');
  });

  it('sanitizes inventory movements with default values', () => {
    const movement = sanitizeInventoryMovement(
      {
        itemId: ' item-1 ',
        itemName: ' Shampoo ',
        movementType: 'stock_in',
        reason: 'purchase',
        quantity: 5,
        dateStr: '2026-05-08',
      },
      'mv-1'
    );

    expect(movement.itemId).toBe('item-1');
    expect(movement.itemName).toBe('Shampoo');
    expect(movement.movementType).toBe('stock_in');
    expect(movement.reason).toBe('purchase');
    expect(movement.quantity).toBe(5);
  });
});