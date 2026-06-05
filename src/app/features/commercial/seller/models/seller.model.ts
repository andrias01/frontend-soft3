export type SellerStatus = 'ACTIVE' | 'INACTIVE';

export interface Seller {
  id?: string;
  documentTypeId: string;
  locationId: string;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  commissionPercentage: number;
  status?: SellerStatus;
  createdDate?: string;
  modifiedDate?: string;
}

export type CreateSellerRequest = Pick<
  Seller,
  | 'documentTypeId'
  | 'locationId'
  | 'identificationNumber'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'commissionPercentage'
>;

export type UpdateSellerRequest = CreateSellerRequest;

export type PatchSellerRequest = Partial<CreateSellerRequest> & {
  status?: SellerStatus;
};

export interface UpdateSellerStatusRequest {
  status: SellerStatus;
}

export interface DocumentTypeOption {
  id: string;
  label: string;
  shortLabel: string;
}
