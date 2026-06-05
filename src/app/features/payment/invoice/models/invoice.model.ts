export type InvoiceStatus =
  | 'OPEN'
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CLOSED'
  | 'CANCELLED'
  | 'VOIDED';

export interface Discount {
  id: string;
  categoryId: string;
  percentage: number;
  description: string;
  status: boolean;
  createdAt: string;
  modifiedAt: string;
}

export type SaleStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;

export interface SaleDetailResponse {
  id?: string;
  recipeId?: string;
  itemName?: string;
  recipeName?: string;
  productName?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  comment?: string | null;
  recipeLineComment?: string | null;
  lineDisplayName?: string | null;
}

export interface SaleResponse {
  id: string;
  sellerId?: string;
  locationId?: string;
  locationName?: string;
  tableId?: string | null;
  tableSessionId?: string | null;
  customerId?: string | null;
  status: SaleStatus;
  totalAmount: number;
  details: SaleDetailResponse[];
  createdDate?: string;
  modifiedDate?: string;
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'INACTIVE' | string;

export interface TableSessionDTO {
  id?: string;
  tableId?: string;
  reservationId?: string;
  guestCount?: number;
  waiterId?: string;
  openedAt?: string;
  closedAt?: string;
  durationMinutes?: number;
  durationText?: string;
  observations?: string;
}

export interface TableDTO {
  id?: string;
  tableNumber?: number | string;
  location?: string;
  isVip?: boolean;
  hasView?: boolean;
  isAccessible?: boolean;
  venueId?: string;
  status?: TableStatus;
  active?: boolean;
  reserved?: boolean;
  canOpenNow?: boolean;
  canOpenWithReservation?: boolean;
  displayStatus?: string;
  activeSession?: TableSessionDTO;
  createdDate?: string;
  modifiedDate?: string;
}

export interface InvoiceDetailRequest {
  recipeId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  comment?: string | null;
}

export interface InvoiceRequest {
  salesId: string;
  locationId: string;
  locationName: string;
  tableId?: string | null;
  tableSessionId?: string | null;
  customerId?: string | null;
  discountId?: string | null;
  discountPercentage?: number | null;
  discountDescription?: string | null;
  subtotal: number;
  totalAmount: number;
  details: InvoiceDetailRequest[];
}

export interface InvoiceAcceptedResponse {
  message?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  requestedAt?: string;
  status?: string;
}

export interface InvoiceResponse {
  invoiceId: string;
  invoiceNumber?: string | null;
  status: InvoiceStatus | string;
  invoiceDate?: string;
  salesId: string;
  locationId: string;
  locationName: string;
  tableId?: string | null;
  tableSessionId?: string | null;
  customerId?: string | null;
  discountId?: string | null;
  discountPercentage?: number | null;
  discountDescription?: string | null;
  subtotal: number;
  totalAmount?: number;
  totalPrice?: number;
  discountAmount?: number | null;
  taxAmount?: number | null;
  details: InvoiceDetailRequest[];
}

export interface InvoiceStatusUpdateRequest {
  status: InvoiceStatus | string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
