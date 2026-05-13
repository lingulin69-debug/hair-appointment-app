export type ItemType = 'service' | 'product';

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  duration: string;
  type: ItemType;
  color?: string;
}

export type AppointmentStatus = 'pending' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientId?: string;
  clientName: string;
  phone?: string;
  time: string;
  service: string;
  pax: number;
  notes: string;
  dateStr: string;
  totalPrice: number;
  status: AppointmentStatus;
  rescheduleCount: number;
  transactionId?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  preference: string;
  product: string;
  lastVisit?: string;
  visitCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CheckoutStatus = 'draft' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface CheckoutLineItem {
  itemId?: string;
  itemName: string;
  itemType: ItemType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string;
}

export interface CheckoutRecord {
  id: string;
  clientId: string;
  clientName: string;
  appointmentId?: string;
  dateStr: string;
  lineItems: CheckoutLineItem[];
  subtotal: number;
  discountAmount: number;
  adjustmentAmount: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  note?: string;
  status: CheckoutStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type InventoryMovementType = 'stock_in' | 'stock_out' | 'adjustment';
export type InventoryMovementReason =
  | 'purchase'
  | 'sale'
  | 'manual_adjustment'
  | 'return'
  | 'other';

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  movementType: InventoryMovementType;
  reason: InventoryMovementReason;
  quantity: number;
  dateStr: string;
  unitCost?: number;
  relatedTransactionId?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RevenueCategory = string;
export type RevenueKind = 'income' | 'expense';
export type RevenueSource = 'manual' | 'appointment';

export interface Revenue {
  id: string;
  amount: number;
  date: string;
  category: RevenueCategory;
  kind: RevenueKind;
  source?: RevenueSource;
  note?: string;
  linkedAppointmentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type LeaveType = string;

export interface Leave {
  id: string;
  date: string;
  type: LeaveType;
}

export type CollectionName =
  | 'appointments'
  | 'clients'
  | 'transactions'
  | 'revenues'
  | 'leaves'
  | 'storeItems'
  | 'inventoryMovements';
