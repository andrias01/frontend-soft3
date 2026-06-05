export type ProviderStatus = 'ACTIVE' | 'INACTIVE';

export interface Provider {
  id: string;
  businessName: string;
  documentTypeId: number;
  documentNumber: string;
  taxRegimeId: number;
  responsibleFirstName: string;
  responsibleLastName: string;
  phone: string;
  email: string;
  departmentId: number;
  cityId: number;
  address: string;
  branchId: number;
  status: ProviderStatus;
  createdDate?: string;
  modifiedDate?: string;
}

export interface CreateProviderRequest {
  businessName: string;
  documentTypeId: number;
  documentNumber: string;
  taxRegimeId: number;
  responsibleFirstName: string;
  responsibleLastName: string;
  phone: string;
  email: string;
  departmentId: number;
  cityId: number;
  address: string;
  branchId: number;
}

export type UpdateProviderRequest = CreateProviderRequest;

export interface UpdateProviderStatusRequest {
  status: ProviderStatus;
}

export interface CatalogOption {
  id: number;
  label: string;
  shortLabel?: string;
}

export interface CityOption extends CatalogOption {
  departmentId: number;
}

export interface ApiErrorBody {
  message?: string;
}
