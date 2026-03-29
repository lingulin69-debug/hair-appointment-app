export type ItemType = 'service' | 'product';

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  duration: string;
  type: ItemType;
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
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  preference: string;
  product: string;
  lastVisit?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RevenueCategory = string;

export interface Revenue {
  id: string;
  amount: number;
  date: string;
  category: RevenueCategory;
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
  | 'revenues'
  | 'leaves'
  | 'storeItems';
