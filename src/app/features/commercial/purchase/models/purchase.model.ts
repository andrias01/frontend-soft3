export type PurchaseStatus = 'CREATED' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseItemResponse {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseResponse {
  id: string;
  orderNumber: string;
  providerId: string;
  locationId: string;
  items: PurchaseItemResponse[];
  total: number;
  status: PurchaseStatus;
  createdDate: string;
  modifiedDate: string;
}

export interface CreatePurchaseItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseRequest {
  providerId: string;
  items: CreatePurchaseItemRequest[];
}

export interface UpdatePurchaseStatusRequest {
  status: PurchaseStatus;
  cancelReason?: string;
}