import type {
  CheckoutLineItem,
  CheckoutRecord,
  InventoryMovement,
  InventoryMovementReason,
  InventoryMovementType,
  PaymentMethod,
} from '../types';
import { formatDateString, isExactDateString } from './schedule';

type CheckoutRecordInput = Partial<Omit<CheckoutRecord, 'lineItems'>> & {
  lineItems?: Array<Partial<CheckoutLineItem>> | null;
};

function normalizeNonNegativeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeSignedNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQuantity(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 1);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
}

function normalizePaymentMethod(value: unknown): PaymentMethod | undefined {
  if (value === 'cash' || value === 'card' || value === 'transfer' || value === 'other') {
    return value;
  }

  return undefined;
}

function normalizeMovementType(value: unknown): InventoryMovementType {
  if (value === 'stock_in' || value === 'adjustment') {
    return value;
  }

  return 'stock_out';
}

function normalizeMovementReason(value: unknown): InventoryMovementReason {
  if (
    value === 'purchase' ||
    value === 'sale' ||
    value === 'manual_adjustment' ||
    value === 'return' ||
    value === 'other'
  ) {
    return value;
  }

  return 'other';
}

function normalizeDateString(value: unknown): string {
  return typeof value === 'string' && isExactDateString(value)
    ? value
    : formatDateString(new Date());
}

export function sanitizeCheckoutLineItem(entry: Partial<CheckoutLineItem>): CheckoutLineItem {
  const quantity = normalizeQuantity(entry.quantity);
  const unitPrice = normalizeNonNegativeNumber(entry.unitPrice);
  const totalPrice =
    entry.totalPrice === undefined
      ? unitPrice * quantity
      : normalizeNonNegativeNumber(entry.totalPrice);
  const itemType = entry.itemType === 'product' ? 'product' : 'service';
  const itemName =
    typeof entry.itemName === 'string' && entry.itemName.trim()
      ? entry.itemName.trim()
      : '未命名項目';
  const itemId =
    typeof entry.itemId === 'string' && entry.itemId.trim() ? entry.itemId.trim() : undefined;
  const note = typeof entry.note === 'string' && entry.note.trim() ? entry.note.trim() : undefined;

  return {
    itemName,
    itemType,
    quantity,
    unitPrice,
    totalPrice,
    ...(itemId ? { itemId } : {}),
    ...(note ? { note } : {}),
  };
}

export function calculateCheckoutSubtotal(
  lineItems: Array<Partial<CheckoutLineItem>> | null | undefined
): number {
  return (Array.isArray(lineItems) ? lineItems : [])
    .map((entry) => sanitizeCheckoutLineItem(entry))
    .reduce((total, entry) => total + entry.totalPrice, 0);
}

export function calculateCheckoutTotal(
  subtotal: number,
  discountAmount = 0,
  adjustmentAmount = 0
): number {
  return Math.max(
    0,
    normalizeNonNegativeNumber(subtotal) -
      normalizeNonNegativeNumber(discountAmount) +
      normalizeSignedNumber(adjustmentAmount)
  );
}

export function sanitizeCheckoutRecord(
  entry: CheckoutRecordInput,
  id: string
): CheckoutRecord {
  const lineItems = (Array.isArray(entry.lineItems) ? entry.lineItems : [])
    .map((lineItem) => sanitizeCheckoutLineItem(lineItem))
    .filter((lineItem) => lineItem.totalPrice > 0);
  const subtotal =
    entry.subtotal === undefined
      ? calculateCheckoutSubtotal(lineItems)
      : normalizeNonNegativeNumber(entry.subtotal);
  const discountAmount = normalizeNonNegativeNumber(entry.discountAmount);
  const adjustmentAmount = normalizeSignedNumber(entry.adjustmentAmount);
  const totalAmount =
    entry.totalAmount === undefined
      ? calculateCheckoutTotal(subtotal, discountAmount, adjustmentAmount)
      : normalizeNonNegativeNumber(entry.totalAmount);
  const status =
    entry.status === 'draft' || entry.status === 'cancelled' ? entry.status : 'completed';
  const clientId =
    typeof entry.clientId === 'string' && entry.clientId.trim() ? entry.clientId.trim() : '';
  const clientName =
    typeof entry.clientName === 'string' && entry.clientName.trim()
      ? entry.clientName.trim()
      : '未命名顧客';
  const appointmentId =
    typeof entry.appointmentId === 'string' && entry.appointmentId.trim()
      ? entry.appointmentId.trim()
      : undefined;
  const paymentMethod = normalizePaymentMethod(entry.paymentMethod);
  const note = typeof entry.note === 'string' && entry.note.trim() ? entry.note.trim() : undefined;
  const createdAt =
    typeof entry.createdAt === 'string' && entry.createdAt.trim() ? entry.createdAt.trim() : undefined;
  const updatedAt =
    typeof entry.updatedAt === 'string' && entry.updatedAt.trim() ? entry.updatedAt.trim() : undefined;

  return {
    id,
    clientId,
    clientName,
    dateStr: normalizeDateString(entry.dateStr),
    lineItems,
    subtotal,
    discountAmount,
    adjustmentAmount,
    totalAmount,
    status,
    ...(appointmentId ? { appointmentId } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(note ? { note } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function createCheckoutPayload(
  entry: Omit<CheckoutRecord, 'id'>
): Omit<CheckoutRecord, 'id'> {
  const normalized = sanitizeCheckoutRecord(
    {
      ...entry,
      createdAt: entry.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    'draft'
  );

  return {
    clientId: normalized.clientId,
    clientName: normalized.clientName,
    dateStr: normalized.dateStr,
    lineItems: normalized.lineItems,
    subtotal: normalized.subtotal,
    discountAmount: normalized.discountAmount,
    adjustmentAmount: normalized.adjustmentAmount,
    totalAmount: normalized.totalAmount,
    status: normalized.status,
    ...(normalized.appointmentId ? { appointmentId: normalized.appointmentId } : {}),
    ...(normalized.paymentMethod ? { paymentMethod: normalized.paymentMethod } : {}),
    ...(normalized.note ? { note: normalized.note } : {}),
    ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
    ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
  };
}

export function sanitizeInventoryMovement(
  entry: Partial<InventoryMovement>,
  id: string
): InventoryMovement {
  const itemId =
    typeof entry.itemId === 'string' && entry.itemId.trim() ? entry.itemId.trim() : '';
  const itemName =
    typeof entry.itemName === 'string' && entry.itemName.trim()
      ? entry.itemName.trim()
      : '未命名商品';
  const note = typeof entry.note === 'string' && entry.note.trim() ? entry.note.trim() : undefined;
  const relatedTransactionId =
    typeof entry.relatedTransactionId === 'string' && entry.relatedTransactionId.trim()
      ? entry.relatedTransactionId.trim()
      : undefined;
  const createdAt =
    typeof entry.createdAt === 'string' && entry.createdAt.trim() ? entry.createdAt.trim() : undefined;
  const updatedAt =
    typeof entry.updatedAt === 'string' && entry.updatedAt.trim() ? entry.updatedAt.trim() : undefined;
  const unitCost =
    entry.unitCost === undefined ? undefined : normalizeNonNegativeNumber(entry.unitCost);

  return {
    id,
    itemId,
    itemName,
    movementType: normalizeMovementType(entry.movementType),
    reason: normalizeMovementReason(entry.reason),
    quantity: normalizeQuantity(entry.quantity),
    dateStr: normalizeDateString(entry.dateStr),
    ...(unitCost !== undefined ? { unitCost } : {}),
    ...(relatedTransactionId ? { relatedTransactionId } : {}),
    ...(note ? { note } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export function createInventoryMovementPayload(
  entry: Omit<InventoryMovement, 'id'>
): Omit<InventoryMovement, 'id'> {
  const normalized = sanitizeInventoryMovement(
    {
      ...entry,
      createdAt: entry.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    'draft'
  );

  return {
    itemId: normalized.itemId,
    itemName: normalized.itemName,
    movementType: normalized.movementType,
    reason: normalized.reason,
    quantity: normalized.quantity,
    dateStr: normalized.dateStr,
    ...(normalized.unitCost !== undefined ? { unitCost: normalized.unitCost } : {}),
    ...(normalized.relatedTransactionId
      ? { relatedTransactionId: normalized.relatedTransactionId }
      : {}),
    ...(normalized.note ? { note: normalized.note } : {}),
    ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
    ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
  };
}