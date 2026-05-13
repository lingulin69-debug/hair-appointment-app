import type {
  Appointment,
  CheckoutRecord,
  InventoryMovement,
  StoreItem,
} from '../types';

export function createCheckoutDraftFromAppointment(
  appointment: Appointment,
  storeItems: StoreItem[] | null | undefined
): Omit<CheckoutRecord, 'id'> {
  const serviceItem = (Array.isArray(storeItems) ? storeItems : []).find(
    (item) => item.type === 'service' && item.name === appointment.service
  );
  const quantity = Math.max(1, appointment.pax || 1);
  const unitPrice =
    appointment.totalPrice > 0
      ? appointment.totalPrice / quantity
      : serviceItem?.price ?? 0;
  const totalPrice = appointment.totalPrice > 0 ? appointment.totalPrice : unitPrice * quantity;
  const note = appointment.notes?.trim() ?? '';

  return {
    clientId: appointment.clientId ?? '',
    clientName: appointment.clientName,
    appointmentId: appointment.id,
    dateStr: appointment.dateStr,
    lineItems: [
      {
        itemName: appointment.service || serviceItem?.name || '服務項目',
        itemType: 'service',
        quantity,
        unitPrice,
        totalPrice,
        ...(serviceItem?.id ? { itemId: serviceItem.id } : {}),
      },
    ],
    subtotal: totalPrice,
    discountAmount: 0,
    adjustmentAmount: 0,
    totalAmount: totalPrice,
    paymentMethod: 'cash',
    ...(note ? { note } : {}),
    status: 'completed',
  };
}

export function buildInventoryMovementsFromCheckout(
  checkoutRecord: Omit<CheckoutRecord, 'id'>,
  transactionId: string
): Array<Omit<InventoryMovement, 'id'>> {
  return checkoutRecord.lineItems
    .filter(
      (item) =>
        item.itemType === 'product' &&
        typeof item.itemId === 'string' &&
        item.itemId.trim().length > 0 &&
        item.quantity > 0
    )
    .map((item) => ({
      itemId: item.itemId!.trim(),
      itemName: item.itemName,
      movementType: 'stock_out' as const,
      reason: 'sale' as const,
      quantity: item.quantity,
      dateStr: checkoutRecord.dateStr,
      relatedTransactionId: transactionId,
      ...(checkoutRecord.note ? { note: checkoutRecord.note } : {}),
    }));
}