export type SaleStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RecipePreparationTraceStatus = 'ACCEPTED' | 'REJECTED';

export interface SaleDetailRequest {
  recipeId: string;
  quantity: number;
  unitPrice: number;
  recipeLineComment: string;
  lineDisplayName?: string | null;
}

export interface SaleRequest {
  sellerId: string;
  locationId: string;
  tableId: string;
  details: SaleDetailRequest[];
}

export interface SaleDetailResponse extends SaleDetailRequest {
  id?: string;
  subtotal: number;
}

export interface SaleResponse {
  id: string;
  sellerId: string;
  locationId: string;
  tableId: string;
  status: SaleStatus;
  totalAmount: number;
  details: SaleDetailResponse[];
  createdDate?: string;
  modifiedDate?: string;
}

export interface SaleAsyncResponse {
  saleId: string;
  message: string;
  requestedAt?: string;
}

export interface RecipeResponse {
  id: string;
  name: string;
  sellingPrice: number;
  visibleInMenu: boolean;
  active: boolean;
  categoryId?: string;
  locationId?: string;
}

export interface RecipePreparationTrace {
  id: string;
  saleId: string;
  saleDetailId?: string;
  recipeId: string;
  status: RecipePreparationTraceStatus;
  observation?: string | null;
  createdDate?: string;
  modifiedDate?: string;
}

export interface Seller {
  id: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  document?: string;
  identificationNumber?: string;
  identification_number?: string;
  documentNumber?: string;
  document_number?: string;
  identification?: string;
  identificationNumberId?: string;
  identification_number_id?: string;
  status?: string;
  active?: boolean;
}

export interface RestaurantTable {
  id: string;
  name?: string;
  tableName?: string;
  number?: string | number;
  tableNumber?: string | number;
  code?: string;
  displayName?: string;
  status?: string;
  available?: boolean;
  occupied?: boolean;
  reserved?: boolean;
  canOpenNow?: boolean;
  active?: boolean;
  locationId?: string;
}

export interface CartItem {
  recipeId: string;
  recipeName: string;
  lineDisplayName: string;
  quantity: number;
  unitPrice: number;
  recipeLineComment: string;
}
