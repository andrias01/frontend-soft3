export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  jwt?: string;
  tokenType?: string;
  expiresInSeconds?: number;
  locationId?: string;
  user?: {
    locationId?: string;
  };
}
