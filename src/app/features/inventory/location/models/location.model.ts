export interface LocationResponse {
  id: string;
  name: string;
  city: string;
  address: string;
  active: boolean;
  email: string;
  phoneNumber: string;
  startTime: string;
  endTime: string;
}

export interface LocationRequest {
  name: string;
  city: string;
  address: string;
  active: boolean;
  email: string;
  phoneNumber: string;
  startTime: string;
  endTime: string;
}

export interface LocationPatchRequest {
  active: boolean;
}
