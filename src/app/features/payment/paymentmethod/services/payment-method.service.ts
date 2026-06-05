import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';
import { PaymentMethodResponse, CreatePaymentMethodRequest } from '@payment/paymentmethod/models/payment-method.model';

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${ENV.apiUrl}/payment-methods`;

  getActive(): Observable<PaymentMethodResponse[]> {
    return this.http.get<PaymentMethodResponse[]>(this.baseUrl);
  }

  getAll(): Observable<PaymentMethodResponse[]> {
    return this.http.get<PaymentMethodResponse[]>(`${this.baseUrl}/all`);
  }

  create(request: CreatePaymentMethodRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl, request);
  }

  toggleStatus(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/toggle-status`, {});
  }
}
