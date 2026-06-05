export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface CategoryResponse {
  id: string;
  cns: number;
  type: string;
  subtype: string;
  name: string;
  locationId?: string;
  entryDate: string;
  status: CategoryStatus;
}

export interface CreateCategoryRequest {
  type: string;
  subtype: string;
  name: string;
  locationId: string;
}

export interface CategoryStatusUpdateRequest {
  status: CategoryStatus;
}

export type CategoryListFilter = 'TODOS' | 'ACTIVE' | 'INACTIVE';
