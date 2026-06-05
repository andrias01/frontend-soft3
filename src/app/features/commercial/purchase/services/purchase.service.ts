import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';
import {
  PurchaseResponse,
  CreatePurchaseRequest,
  UpdatePurchaseStatusRequest,
  PurchaseStatus
} from '../models/purchase.model';

export interface Page<T> {
  content: T[];
  page: {
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  };
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {

  private baseUrl(locationId: string): string {
    return `${ENV.apiUrl}/locations/${locationId}/purchases`;
  }

  constructor(private http: HttpClient) {}

  getPurchases(
    locationId: string,
    status?: PurchaseStatus,
    orderNumber?: string,
    providerId?: string,
    startDate?: string,
    endDate?: string,
    page = 0,
    size = 10
  ): Observable<Page<PurchaseResponse>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (status)      params = params.set('status', status);
    if (orderNumber) params = params.set('orderNumber', orderNumber);
    if (providerId)  params = params.set('providerId', providerId);
    if (startDate)   params = params.set('startDate', startDate);
    if (endDate)     params = params.set('endDate', endDate);

    return this.http.get<Page<PurchaseResponse>>(
      this.baseUrl(locationId), { params }
    );
  }

  getPurchaseById(locationId: string, purchaseId: string): Observable<PurchaseResponse> {
    return this.http.get<PurchaseResponse>(
      `${this.baseUrl(locationId)}/${purchaseId}`
    );
  }

  createPurchase(locationId: string, request: CreatePurchaseRequest): Observable<PurchaseResponse> {
    return this.http.post<PurchaseResponse>(this.baseUrl(locationId), request);
  }

  updatePurchase(
    locationId: string,
    purchaseId: string,
    request: CreatePurchaseRequest
  ): Observable<PurchaseResponse> {
    return this.http.put<PurchaseResponse>(
      `${this.baseUrl(locationId)}/${purchaseId}`, request
    );
  }

  updateStatus(
    locationId: string,
    purchaseId: string,
    request: UpdatePurchaseStatusRequest
  ): Observable<PurchaseResponse> {
    return this.http.patch<PurchaseResponse>(
      `${this.baseUrl(locationId)}/${purchaseId}/status`, request
    );
  }

  deletePurchase(locationId: string, purchaseId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl(locationId)}/${purchaseId}`
    );
  }
}