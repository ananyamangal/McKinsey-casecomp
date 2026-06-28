import type { BaseEntity, ID, ISODateString, Money, TrendPoint } from "./common";
import type {
  ABCClass,
  AppointmentStatus,
  BayStatus,
  InvoiceStatus,
  PaymentMethod,
  PurchaseOrderStatus,
  StockHealth,
  TransactionType,
  UserRole,
  WorkOrderStatus,
} from "./enums";

export interface Dealership extends BaseEntity {
  name: string;
  brand: string;
  city: string;
  region: string;
  gstNumber: string;
  bayCount: number;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  dealershipId: ID;
  active: boolean;
}

export interface Customer extends BaseEntity {
  name: string;
  email?: string;
  phone: string;
  whatsappOptIn: boolean;
  whatsappReachable: boolean;
  city: string;
  loyaltyTier: "bronze" | "silver" | "gold" | "platinum";
  loyaltyPoints: number;
  lifetimeValue: Money;
  vehicleCount: number;
  lastVisitAt?: ISODateString;
  satisfactionScore: number; // 0-100
}

export interface Vehicle extends BaseEntity {
  vin: string;
  chassisNumber: string;
  registration: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  color: string;
  ownerId: ID;
  ownerName: string;
  mileageKm: number;
  warrantyValidUntil?: ISODateString;
  healthScore: number; // 0-100
  nextServiceDueKm?: number;
  imageUrl?: string;
}

export interface TelematicsEvent extends BaseEntity {
  vehicleId: ID;
  type: "brake_wear" | "battery" | "tyre_pressure" | "engine" | "dtc_code" | "mileage";
  label: string;
  value: number;
  unit: string;
  severity: "info" | "warning" | "critical";
  recordedAt: ISODateString;
}

export interface PredictedMaintenance {
  vehicleId: ID;
  component: string;
  remainingPct: number;
  predictedDueDate: ISODateString;
  estimatedCost: Money;
  confidence: number; // 0-1
}

export interface InstalledPart {
  partId: ID;
  name: string;
  sku: string;
  installedAt: ISODateString;
  mileageAtInstallKm: number;
}

export interface Technician extends BaseEntity {
  name: string;
  avatarUrl?: string;
  specialty: string;
  utilizationPct: number;
  jobsCompletedToday: number;
  rating: number; // 0-5
  available: boolean;
}

export interface ServiceBay extends BaseEntity {
  name: string;
  status: BayStatus;
  technicianId?: ID;
  technicianName?: string;
  vehicleId?: ID;
  vehicleLabel?: string;
  workOrderId?: ID;
  jobStatus?: WorkOrderStatus;
  progressPct?: number;
  etaMinutes?: number;
  partsReady?: boolean;
}

export interface Appointment extends BaseEntity {
  customerId: ID;
  customerName: string;
  vehicleId: ID;
  vehicleLabel: string;
  serviceType: string;
  status: AppointmentStatus;
  scheduledFor: ISODateString;
  advisorName: string;
}

export interface WorkOrderLine {
  id: ID;
  description: string;
  type: "labour" | "part";
  quantity: number;
  unitPrice: Money;
}

export interface WorkOrder extends BaseEntity {
  number: string;
  customerId: ID;
  customerName: string;
  vehicleId: ID;
  vehicleLabel: string;
  status: WorkOrderStatus;
  bayId?: ID;
  technicianId?: ID;
  technicianName?: string;
  openedAt: ISODateString;
  promisedAt?: ISODateString;
  lines: WorkOrderLine[];
  total: Money;
  progressPct: number;
}

export interface InventoryItem extends BaseEntity {
  sku: string;
  name: string;
  category: string;
  warehouseLocation: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  predictedDemand30d: number;
  leadTimeDays: number;
  unitCost: Money;
  abcClass: ABCClass;
  health: StockHealth;
  supplierId: ID;
  supplierName: string;
  consumptionTrend: TrendPoint[];
}

export interface InventoryTransaction extends BaseEntity {
  itemId: ID;
  sku: string;
  type: TransactionType;
  quantity: number;
  reference?: string;
  note?: string;
}

export interface Supplier extends BaseEntity {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  rating: number; // 0-5
  onTimeDeliveryPct: number;
  avgLeadTimeDays: number;
  activeOrders: number;
  status: "active" | "on_hold" | "inactive";
}

export interface PurchaseOrderItem {
  id: ID;
  itemId: ID;
  sku: string;
  name: string;
  quantity: number;
  unitCost: Money;
}

export interface PurchaseOrder extends BaseEntity {
  number: string;
  supplierId: ID;
  supplierName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  total: Money;
  expectedDelivery?: ISODateString;
  approverName?: string;
  raisedByName: string;
}

export interface Invoice extends BaseEntity {
  number: string;
  customerId: ID;
  customerName: string;
  workOrderId?: ID;
  status: InvoiceStatus;
  issuedAt: ISODateString;
  dueAt: ISODateString;
  subtotal: Money;
  gstAmount: Money;
  total: Money;
  amountPaid: Money;
  erpSynced: boolean;
}

export interface Payment extends BaseEntity {
  invoiceId: ID;
  invoiceNumber: string;
  method: PaymentMethod;
  amount: Money;
  receivedAt: ISODateString;
  reconciled: boolean;
}

export interface ActivityEvent extends BaseEntity {
  actor: string;
  action: string;
  target: string;
  module: string;
  icon?: string;
}
