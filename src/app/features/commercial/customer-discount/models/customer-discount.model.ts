export interface CustomerDiscount {
  id: string;
  locationId: string;
  customerId: string;
  discountId: string;
  assignedAt: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface CustomerDiscountRequest {
  locationId: string;
  customerId: string;
  discountId: string;
  assignedAt?: string;
  startDate?: string;
  endDate?: string;
}

export interface CustomerDiscountResponse {
  message: string;
  requestedAt: string;
}