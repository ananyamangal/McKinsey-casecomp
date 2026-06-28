/** Domain enumerations. Centralised so UI badges and API validation agree. */

export const UserRole = {
  OWNER: "owner",
  GENERAL_MANAGER: "general_manager",
  SERVICE_ADVISOR: "service_advisor",
  TECHNICIAN: "technician",
  PARTS_MANAGER: "parts_manager",
  FINANCE: "finance",
  VIEWER: "viewer",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AppointmentStatus = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
  CANCELLED: "cancelled",
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const WorkOrderStatus = {
  OPEN: "open",
  AWAITING_PARTS: "awaiting_parts",
  IN_PROGRESS: "in_progress",
  QUALITY_CHECK: "quality_check",
  READY: "ready",
  DELIVERED: "delivered",
  ON_HOLD: "on_hold",
} as const;
export type WorkOrderStatus = (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

export const BayStatus = {
  IDLE: "idle",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
} as const;
export type BayStatus = (typeof BayStatus)[keyof typeof BayStatus];

export const ABCClass = {
  A: "A",
  B: "B",
  C: "C",
} as const;
export type ABCClass = (typeof ABCClass)[keyof typeof ABCClass];

export const StockHealth = {
  HEALTHY: "healthy",
  LOW: "low",
  CRITICAL: "critical",
  OVERSTOCK: "overstock",
  DEAD: "dead",
} as const;
export type StockHealth = (typeof StockHealth)[keyof typeof StockHealth];

export const PurchaseOrderStatus = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  ORDERED: "ordered",
  PARTIALLY_RECEIVED: "partially_received",
  RECEIVED: "received",
  CANCELLED: "cancelled",
} as const;
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const InvoiceStatus = {
  DRAFT: "draft",
  ISSUED: "issued",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  OVERDUE: "overdue",
  VOID: "void",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  CASH: "cash",
  CARD: "card",
  UPI: "upi",
  BANK_TRANSFER: "bank_transfer",
  CHEQUE: "cheque",
  CREDIT: "credit",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const NotificationSeverity = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  CRITICAL: "critical",
} as const;
export type NotificationSeverity = (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

export const TransactionType = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
  ADJUSTMENT: "adjustment",
  RESERVATION: "reservation",
  RELEASE: "release",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
