import { describe, expect, it } from 'vitest';
import {
  calculateCheckoutSubtotal,
  calculateCheckoutTotal,
  isRecentDuplicateCheckout,
  RECENT_DUPLICATE_CHECKOUT_WINDOW_MS,
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

  it('detects a recent duplicate checkout by content fingerprint', () => {
    const baseRecord = {
      clientId: 'client-1',
      clientName: 'Alice',
      dateStr: '2026-05-11',
      lineItems: [
        {
          itemId: 'service-1',
          itemName: 'Cut',
          itemType: 'service' as const,
          quantity: 1,
          unitPrice: 1200,
          totalPrice: 1200,
        },
      ],
      subtotal: 1200,
      discountAmount: 0,
      adjustmentAmount: 0,
      totalAmount: 1200,
      paymentMethod: 'cash' as const,
      note: 'VIP',
      status: 'completed' as const,
    };

    expect(
      isRecentDuplicateCheckout(
        {
          ...baseRecord,
          createdAt: '2026-05-11T10:01:00.000Z',
          updatedAt: '2026-05-11T10:01:00.000Z',
        },
        baseRecord,
        Date.parse('2026-05-11T10:05:00.000Z')
      )
    ).toBe(true);

    expect(
      isRecentDuplicateCheckout(
        {
          ...baseRecord,
          createdAt: '2026-05-11T10:01:00.000Z',
          updatedAt: '2026-05-11T10:01:00.000Z',
        },
        {
          ...baseRecord,
          note: '不是同一筆',
        },
        Date.parse('2026-05-11T10:05:00.000Z')
      )
    ).toBe(false);

    expect(
      isRecentDuplicateCheckout(
        {
          ...baseRecord,
          createdAt: '2026-05-11T10:01:00.000Z',
          updatedAt: '2026-05-11T10:01:00.000Z',
        },
        baseRecord,
        Date.parse('2026-05-11T10:01:00.000Z') + RECENT_DUPLICATE_CHECKOUT_WINDOW_MS + 1
      )
    ).toBe(false);
  });
});