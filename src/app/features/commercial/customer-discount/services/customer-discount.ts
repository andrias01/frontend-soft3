import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';
import { CustomerDiscount, CustomerDiscountRequest, CustomerDiscountResponse } from '@commercial/customer-discount/models/customer-discount.model';

@Injectable({ providedIn: 'root' })
export class CustomerDiscountService {
  private readonly http = inject(HttpClient);
private readonly baseUrl = `${ENV.apiUrl.replace('/api/v1', '')}/commercial/api/v1/customer-discounts`;

  getAll(): Observable<CustomerDiscount[]> {
    return this.http.get<CustomerDiscount[]>(this.baseUrl);
  }

  getById(id: string): Observable<CustomerDiscount> {
    return this.http.get<CustomerDiscount>(`${this.baseUrl}/${id}`);
  }

  create(request: CustomerDiscountRequest): Observable<CustomerDiscountResponse> {
    return this.http.post<CustomerDiscountResponse>(this.baseUrl, request);
  }

  update(id: string, request: CustomerDiscountRequest): Observable<CustomerDiscountResponse> {
    return this.http.put<CustomerDiscountResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<CustomerDiscountResponse> {
    return this.http.delete<CustomerDiscountResponse>(`${this.baseUrl}/${id}`);
  }
}