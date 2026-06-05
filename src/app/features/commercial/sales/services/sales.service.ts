import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EnvironmentService } from '../../../../core/services/environment.service';
import { map, Observable } from 'rxjs';
import { RecipePreparationTrace, SaleAsyncResponse, SaleRequest, SaleResponse, SaleStatus } from '../models/sales.model';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly apiRoot: string;
  private readonly salesBaseUrl: string;

  constructor(private readonly http: HttpClient, private readonly env: EnvironmentService) {
    this.apiRoot = this.env.apiUrl.replace(/\/api\/v1\/?$/, '');
    this.salesBaseUrl = `${this.apiRoot}/commercial/api/v1/sales`;
  }

  getSales(): Observable<SaleResponse[]> { return this.http.get<unknown>(this.salesBaseUrl).pipe(map(v => this.normalize(v))); }
  getSaleById(id: string): Observable<SaleResponse> { return this.http.get<SaleResponse>(`${this.salesBaseUrl}/${id}`); }
  createSale(payload: SaleRequest): Observable<SaleAsyncResponse> { return this.http.post<SaleAsyncResponse>(this.salesBaseUrl, payload); }
  updateSale(id: string, payload: SaleRequest): Observable<SaleAsyncResponse> { return this.http.put<SaleAsyncResponse>(`${this.salesBaseUrl}/${id}`, payload); }
  patchSaleStatus(id: string, status: SaleStatus): Observable<SaleAsyncResponse> { return this.http.patch<SaleAsyncResponse>(`${this.salesBaseUrl}/${id}`, { status }); }
  deleteSale(id: string): Observable<SaleAsyncResponse> { return this.http.delete<SaleAsyncResponse>(`${this.salesBaseUrl}/${id}`); }
  getSalePreparations(saleId: string): Observable<RecipePreparationTrace[]> { return this.http.get<unknown>(`${this.salesBaseUrl}/${saleId}/preparations`).pipe(map(v => this.normalize(v))); }
  getPreparationById(traceId: string): Observable<RecipePreparationTrace> { return this.http.get<RecipePreparationTrace>(`${this.salesBaseUrl}/preparations/${traceId}`); }

  private normalize<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object') {
      const maybe = value as Record<string, unknown>;
      if (Array.isArray(maybe['content'])) return maybe['content'] as T[];
      if (Array.isArray(maybe['data'])) return maybe['data'] as T[];
    }
    return [];
  }
}
