export interface Discount {
  id: string;
  categoryId: string;
  percentage: number;
  description: string;
  status: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateDiscountRequest {
  categoryId: string;
  percentage: number;
  description: string;
}

export interface UpdateDiscountRequest {
  categoryId: string;
  percentage: number;
  description: string;
}

export interface UpdateDiscountStatusRequest {
  status: boolean;
}