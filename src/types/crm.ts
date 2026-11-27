export type Role = "ADMIN" | "MANAGER" | "SALE";

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
    | "CONTACTED"
    | "INQUIRY_QUALIFIED"
    | "QUOTED"
    | "SAMPLE_SENT"
    | "NEGOTIATING"
    | "ACTIVE_WON"
    | "DORMANT"
    | "LOST";
  lostReason: string | null;
  contacts: CustomerContactDTO[];
  _count?: { orders: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProductDTO {
  id: string;
  sku: string;
  name: string;
  specification: string | null;
  unit: string;
  basePrice: number;
}

export interface OrderItemDTO {
  id?: string;
  productId: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDTO {
  id: string;
  orderCode: string;
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
  orderDate: string;
  status: "QUOTED" | "CONFIRMED" | "SHIPPED" | "COMPLETED";
  totalAmount: number;
  notes: string | null;
  items: OrderItemDTO[];
}

