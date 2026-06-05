import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ENV } from '@config/env.config';
import {
  CreateSellerRequest,
  PatchSellerRequest,
  Seller,
  SellerStatus,
  UpdateSellerRequest,
  UpdateSellerStatusRequest,
} from '@commercial/seller/models/seller.model';

@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = ENV.apiUrl.replace(/\/api\/v1\/?$/, '');
  private readonly baseUrl = `${this.apiRoot}/comercialapi/v1/sellers`;

  getSellers(status?: SellerStatus): Observable<Seller[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;

    return this.http
      .get<unknown>(this.baseUrl, params ? { params } : undefined)
      .pipe(map((response) => this.normalizeList(response)));
  }

  getSellerById(id: string): Observable<Seller> {
    return this.http.get<Seller>(`${this.baseUrl}/${id}`);
  }

  createSeller(payload: CreateSellerRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.baseUrl, payload);
  }

  updateSeller(id: string, payload: UpdateSellerRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/${id}`, payload);
  }

  patchSeller(id: string, payload: PatchSellerRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.baseUrl}/${id}`, payload);
  }

  updateStatus(id: string, status: SellerStatus): Observable<{ message: string }> {
    const payload: UpdateSellerStatusRequest = { status };
    return this.http.patch<{ message: string }>(`${this.baseUrl}/${id}/status`, payload);
  }

  private normalizeList(response: unknown): Seller[] {
    if (Array.isArray(response)) {
      return response as Seller[];
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const candidates = [response['content'], response['data'], response['sellers']];
    const list = candidates.find(Array.isArray);

    return Array.isArray(list) ? (list as Seller[]) : [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
