import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';
import {
  Discount,
  CreateDiscountRequest,
  UpdateDiscountRequest,
  UpdateDiscountStatusRequest
} from '@commercial/discount/models/discount.model';

@Injectable({ providedIn: 'root' })
export class DiscountService {
  private readonly http = inject(HttpClient);
private readonly baseUrl = `${ENV.apiUrl.replace('/api/v1', '')}/commercial/api/v1/discounts`;

  getAll(): Observable<Discount[]> {
    return this.http.get<Discount[]>(this.baseUrl);
  }

  getById(id: string): Observable<Discount> {
    return this.http.get<Discount>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateDiscountRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.baseUrl, request);
  }

  update(id: string, request: UpdateDiscountRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/${id}`, request);
  }

  updateStatus(id: string, request: UpdateDiscountStatusRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/${id}/status`, request);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}