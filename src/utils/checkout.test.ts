import { describe, expect, it } from 'vitest';
import type { Appointment, StoreItem } from '../types';
import {
  buildInventoryMovementsFromCheckout,
  createCheckoutDraftFromAppointment,
} from './checkout';

const appointment: Appointment = {
  id: 'appt-1',
  clientId: 'client-1',
  clientName: 'Alice',
  time: '10:00',
  service: 'Cut',
  pax: 2,
  notes: '熟客',
  dateStr: '2026-05-08',
  totalPrice: 2400,
  status: 'pending',
  rescheduleCount: 0,
};

const storeItems: StoreItem[] = [
  {
    id: 'service-1',
    name: 'Cut',
    price: 1200,
    duration: '60',
    type: 'service',
  },
  {
    id: 'product-1',
    name: 'Care Oil',
    price: 450,
    duration: '-',
    type: 'product',
  },
];

describe('checkout utilities', () => {
  it('creates a checkout draft from an appointment', () => {
    const draft = createCheckoutDraftFromAppointment(appointment, storeItems);

    expect(draft.clientId).toBe('client-1');
    expect(draft.lineItems).toHaveLength(1);
    expect(draft.lineItems[0].itemName).toBe('Cut');
    expect(draft.lineItems[0].quantity).toBe(2);
    expect(draft.totalAmount).toBe(2400);
  });

  it('builds stock-out movements only for product items', () => {
    const draft = createCheckoutDraftFromAppointment(appointment, storeItems);
    draft.lineItems.push({
      itemId: 'product-1',
      itemName: 'Care Oil',
      itemType: 'product',
      quantity: 2,
      unitPrice: 450,
      totalPrice: 900,
    });

    const movements = buildInventoryMovementsFromCheckout(draft, 'tx-1');

    expect(movements).toEqual([
      {
        itemId: 'product-1',
        itemName: 'Care Oil',
        movementType: 'stock_out',
        reason: 'sale',
        quantity: 2,
        dateStr: '2026-05-08',
        relatedTransactionId: 'tx-1',
        note: '熟客',
      },
    ]);
  });
});