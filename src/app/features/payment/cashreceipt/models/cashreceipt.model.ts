// ─────────────────────────────────────────────
//  Matches: CashReceiptResponse.java
// ─────────────────────────────────────────────
export interface CashReceiptResponse {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMethodId: string;
  paymentMethodName: string;
  status: 'PAID' | 'CANCELLED';
  createdAt: string;
  cancelledAt: string | null;
}

// ─────────────────────────────────────────────
//  Matches: CreateCashReceiptRequest.java
// ─────────────────────────────────────────────
export interface CreateCashReceiptRequest {
  invoiceId: string;
  amount: number;
  paymentMethodId: string;
}

// ─────────────────────────────────────────────
//  Matches: InvoiceResponse.java
// ─────────────────────────────────────────────
export type InvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface InvoiceDetailResponse {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoiceResponse {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  salesId: string;
  customerDiscountId: string | null;
  locationId: string;
  discountId: string | null;
  tableId: string | null;
  locationName: string;
  customerId: string;
  discountPercentage: number | null;
  discountDescription: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalPrice: number;
  details: InvoiceDetailResponse[];
}

// ─────────────────────────────────────────────
//  Generic paginated response from Spring Data
// ─────────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
