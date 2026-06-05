export interface JwtPayload {
  sub?: string;
  email?: string;
}

export interface UserSummaryResponse {
  id: string;
  documentNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  location: string;
  phone: string;
  status: string;
}

export interface UserDetailResponse {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  email: string;
  birthDate: string;
  department: string;
  city: string;
  address: string;
  location: string;
  status: string;
}

export interface DocumentTypeOption {
  id: string;
  code: string;
  name: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface CityOption {
  id: string;
  departmentId: string;
  name: string;
}

export interface LocationOption {
  id: string;
  name: string;
}

export interface UserEditModel {
  firstName: string;
  lastName: string;
  documentTypeId: string;
  documentNumber: string;
  phone: string;
  email: string;
  birthDate: string;
  departmentId: string;
  cityId: string;
  address: string;
  locationId: string;
}

export interface UpdateUserPayload {
  firstName: string;
  lastName: string;
  documentTypeId: string;
  documentNumber: string;
  phone: string;
  birthDate: string;
  departmentId: string;
  cityId: string;
  address: string;
  locationId: string;
}

export interface RegisterUserPayload {
  firstName: string;
  lastName: string;
  documentTypeId: string;
  documentNumber: string;
  phone: string;
  email: string;
  password: string;
  birthDate: string;
  departmentId: string;
  cityId: string;
  address: string;
  locationId: string;
}

export interface UserProfileData {
  userId: string;
  editable: UserEditModel;
  documentTypes: DocumentTypeOption[];
  departments: DepartmentOption[];
  cities: CityOption[];
  locations: LocationOption[];
}

export type EditableField = keyof UserEditModel;
