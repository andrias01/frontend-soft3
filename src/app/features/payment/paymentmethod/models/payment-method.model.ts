export interface PaymentMethodResponse {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface CreatePaymentMethodRequest {
  name: string;
  description: string;
  active: boolean;
}
