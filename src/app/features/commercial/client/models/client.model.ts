export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export interface Client {
  id?: string;
  firstName: string;
  secondName: string;
  firstLastName: string;
  secondLastName: string;
  documentTypeId: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  cityId: string;
  taxRegimeId: string;
  assignedSellerId: number;
  applyDiscounts: boolean;
  status?: ClientStatus;
}

export type CreateClientRequest = Omit<Client, 'id' | 'status'>;
export type UpdateClientRequest = CreateClientRequest;

export interface ClientStatusUpdateRequest {
  active: boolean;
}

export interface ClientAsyncResponse {
  message: string;
  timestamp?: string;
}

export interface ApiErrorBody {
  message?: string;
  code?: string;
  errorCode?: string;
}

export interface CatalogOption {
  id: string;
  label: string;
  shortLabel?: string;
}

export interface CityOption extends CatalogOption {
  departmentId: string;
}
