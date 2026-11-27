export type Role = "ADMIN" | "MANAGER" | "SALES_ADMIN" | "SALE";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface CustomerContactDTO {
  id?: string;
  name: string;
  position: string;
  email: string;
  phoneWhatsAppWeChat: string;
  isPrimary: boolean;
}

export interface CustomerActivityDTO {
  id: string;
  customerId: string;
  userId: string;
  user?: { id: string; name: string };
  channel: string;
  summary: string;
  nextFollowUpDate: string | null;
  createdAt: string;
}

export interface CustomerDTO {
  id: string;
  customerCode: string;
  companyName: string;
  countryRegion: string;
  portOfDestination: string | null;
  channel: "IMPORTER" | "DISTRIBUTOR" | "SUPERMARKET" | "OEM" | "TRADING";
  source: "TRADE_FAIR" | "B2B_PLATFORM" | "CUSTOMS_DATA" | "WEBSITE" | "REFERRAL";
  salesRepId: string;
  salesRep: UserDTO;
  pipelineStage:
    | "NEW_LEAD"
    | "QUOTED"
    | "NEGOTIATING"
    | "ACTIVE_WON"
    | "LOST";
  lostReason: string | null;
  lastActivityAt: string;
  nextFollowUpDate: string | null;
  contacts: CustomerContactDTO[];
  activities?: CustomerActivityDTO[];
  _count?: { orders: number; quotations?: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProductDTO {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  specification: string | null;
  unit: string;
  netWeightGrams: number;
  packsPerCarton: number;
  cartonDimensions: string | null;
  cbm: number | null;
  capacity20ft: number | null;
  capacity40hc: number | null;
  costPrice?: number;
  minMarginPercent: number;
  basePrice: number;
}

export interface QuotationItemDTO {
  id?: string;
  productId: string;
  product?: ProductDTO;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface QuotationDTO {
  id: string;
  quoteCode: string;
  version: number;
  customerId: string;
  customer: {
    id: string;
    customerCode: string;
    companyName: string;
    countryRegion: string;
  };
  salesRepId: string;
  salesRep: { id: string; name: string; role: Role };
  quoteType: "STANDARD" | "OEM";
  incoterm: "EXW" | "FOB" | "CFR" | "CIF";
  portName: string | null;
  exchangeRate: number;
  targetPrice: number | null;
  packagingCost: number;
  testingCost: number;
  localCharges: number;
  seaFreight: number;
  marginPercent: number;
  totalAmount: number;
  specsNotes: string | null;
  specsCheckStatus: "NOT_REQUIRED" | "PENDING" | "FEASIBLE" | "NOT_FEASIBLE";
  moq: string | null;
  leadTimeDays: number | null;
  approvalStatus: "AUTO_APPROVED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  approvedBy?: { id: string; name: string } | null;
  convertedOrderId: string | null;
  items: QuotationItemDTO[];
  createdAt: string;
}

export interface OrderPaymentDTO {
  id: string;
  orderId: string;
  paymentType: "DEPOSIT" | "BALANCE" | "OTHER";
  amount: number;
  dueDate: string | null;
  paidDate: string | null;
  swiftRef: string | null;
  notes: string | null;
  createdAt: string;
}

export interface OrderItemDTO {
  id?: string;
  productId: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    category?: string | null;
    specification?: string | null;
    unit: string;
    netWeightGrams: number;
    packsPerCarton: number;
  };
  category?: string | null;
  specification?: string | null;
  unit?: string | null;
  quantity: number;
  weightKg?: number | null;
  market?: string | null;
  deliveryDate?: string | null;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDTO {
  id: string;
  orderCode: string;
  poNumber: string | null;
  productionOrderNo?: string | null;
  customerId: string;
  customer: {
    id: string;
    customerCode: string;
    companyName: string;
    countryRegion: string;
    portOfDestination: string | null;
  };
  salesRepId: string;
  salesRep: {
    id: string;
    name: string;
    role: Role;
  };
  orderType: "STANDARD" | "OEM";
  incoterm: "EXW" | "FOB" | "CFR" | "CIF";
  orderDate: string;
  contractDate: string | null;
  estProductionDate: string | null;
  actualProductionDate: string | null;
  packagingStatus: string | null;
  qaQcStatus: string | null;
  stuffingDate: string | null;
  etd: string | null;
  eta: string | null;
  docsStatus: string | null;
  dhlTracking: string | null;
  containerCount: number;
  containerType?: string | null;
  status:
    | "QUOTED"
    | "CONFIRMED"
    | "IN_PRODUCTION"
    | "READY_TO_SHIP"
    | "SHIPPED"
    | "COMPLETED";
  paymentStatus?: string | null;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  items: OrderItemDTO[];
  payments?: OrderPaymentDTO[];
}
