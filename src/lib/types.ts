import type { CategoryId, ItemKind } from '../data/menu';

export type Role = 'student' | 'vendor' | 'admin';

export interface User {
  id: string;
  fullName: string;
  email: string;
  studentId?: string;
  avatarUrl?: string;
  role: Role;
  stallId?: CategoryId; // vendors only
  passwordHash: string; // SHA-256 (demo auth only — a real provider would own this)
  isDemo?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type WorkloadLevel = 'low' | 'moderate' | 'high';
export type DataSource = 'order_estimate' | 'vendor_report' | 'sensor';

export interface Stall {
  id: CategoryId;
  name: string;
  cuisine: string;
  tagline: string;
  description: string;
  imageUrl?: string;
  hours: { open: string; close: string };
  isOpen: boolean;
  acceptingOrders: boolean;
  capacity: number;
  thresholds: { moderate: number; high: number };
  vendorWorkload: WorkloadLevel | null;
  vendorWorkloadAt: number | null;
  byoContainer: boolean;
  lastStatusUpdated: number;
  createdAt: number;
}

export interface MenuItem {
  id: string;
  stallId: CategoryId;
  kind: ItemKind;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  ingredients?: string[];
  prep: number;
  isAvailable: boolean;
  createdAt: number;
  updatedAt: number;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'collected'
  | 'cancelled'
  | 'rejected';

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string; // snapshot
  unitPrice: number; // snapshot
  quantity: number;
  instructions?: string;
  lineTotal: number;
  prep: number;
}

export type PaymentMethod = 'counter' | 'demo_online';
export type PaymentStatus = 'unpaid' | 'paid_demo' | 'refunded_demo';

export interface Order {
  id: string;
  orderNumber: string;
  pickupCode: string;
  userId: string;
  customerName: string;
  stallId: CategoryId;
  stallName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  pickupType: 'self';
  scheduledPickupAt: number | null;
  estimatedReadyAt: number | null;
  prepMinutes: number;
  timeline: Partial<Record<OrderStatus, number>>;
  cancelReason?: string;
  simulated: boolean;
  feedback?: { food: number; wait: number; overall: number; at: number };
  version: number;
  createdAt: number;
  updatedAt: number;
}

export type NotificationType =
  | 'order_accepted'
  | 'order_preparing'
  | 'order_ready'
  | 'order_cancelled'
  | 'order_rejected'
  | 'order_collected'
  | 'stall_closed'
  | 'pickup_reminder'
  | 'payment';

export interface AppNotification {
  id: string;
  userId: string;
  orderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: number;
}

export interface StatusRecord {
  id: string;
  stallId: CategoryId;
  activeOrders: number;
  waitMinutes: number | null;
  level: WorkloadLevel;
  source: DataSource;
  recordedAt: number;
}

export interface CartLine {
  key: string;
  menuItemId: string;
  quantity: number;
  instructions: string;
}

export interface Cart {
  stallId: CategoryId | null;
  lines: CartLine[];
}

export interface SupportRequest {
  id: string;
  userId: string;
  subject: string;
  message: string;
  orderNumber?: string;
  createdAt: number;
}

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string; code?: string };
