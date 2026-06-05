export type UnitOfMeasure = 'KG' | 'GR' | 'LI' | 'UNI';

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  locationId: string;
  unitOfMeasure: UnitOfMeasure;
  salePrice: number;
  stock: number;
  startDate: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  categoryId: string;
  locationId: string;
  unitOfMeasure: UnitOfMeasure;
  salePrice: number;
  stock: number;
  startDate: string;
}

export interface ProductRequest {
  name: string;
  categoryId: string;
  locationId: string;
  unitOfMeasure: UnitOfMeasure;
  salePrice: number;
  stock: number;
  startDate: string;
}

export interface ProductPatchRequest {
  name?: string;
  categoryId?: string;
  locationId?: string;
  unitOfMeasure?: UnitOfMeasure;
  salePrice?: number;
  stock?: number;
  startDate?: string;
}