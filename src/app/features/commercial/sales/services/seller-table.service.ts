import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of, switchMap } from 'rxjs';
import { EnvironmentService } from '../../../../core/services/environment.service';
import { RestaurantTable, Seller } from '../models/sales.model';

@Injectable({ providedIn: 'root' })
export class SellerTableService {
  private readonly apiRoot: string;
  detectedSellersEndpoint = '';
  detectedTablesEndpoint = '';

  constructor(private readonly http: HttpClient, private readonly env: EnvironmentService) {
    this.apiRoot = this.env.apiUrl.replace(/\/api\/v1\/?$/, '');
  }

  getSellers(): Observable<Seller[]> {
    const locationId = this.env.locationId;
    const locationParam = locationId ? `&locationId=${encodeURIComponent(locationId)}` : '';
    const endpoints = [
      `${this.apiRoot}/comercialapi/v1/sellers?status=ACTIVE${locationParam}`,
      `${this.apiRoot}/comercialapi/v1/sellers${locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''}`,
      `${this.env.apiUrl}/sellers`
    ];
    return this.tryEndpoints<Seller>(endpoints, 'seller');
  }

  getTables(): Observable<RestaurantTable[]> {
    const locationId = this.env.locationId;
    const baseTablesEndpoint = `${this.apiRoot}/commercial/api/v1/tables`;
    const endpoints = [
      locationId ? `${baseTablesEndpoint}?venueId=${encodeURIComponent(locationId)}` : baseTablesEndpoint,
      `${this.apiRoot}/commercial/api/v1/restaurant-tables`,
      `${this.apiRoot}/commercial/api/v1/table-sessions`,
      `${this.env.apiUrl}/restaurant-tables`,
      `${this.env.apiUrl}/table-sessions`
    ];
    return this.tryEndpoints<RestaurantTable>(endpoints, 'table');
  }

  private tryEndpoints<T>(endpoints: string[], type: 'seller' | 'table', idx = 0): Observable<T[]> {
    if (idx >= endpoints.length) return of([]);
    return this.http.get<unknown>(endpoints[idx]).pipe(
      switchMap((r) => {
        const arr = this.normalize<T>(r);
        if (arr.length > 0 || Array.isArray(r)) {
          if (type === 'seller') this.detectedSellersEndpoint = endpoints[idx];
          else this.detectedTablesEndpoint = endpoints[idx];
          return of(arr);
        }
        return this.tryEndpoints<T>(endpoints, type, idx + 1);
      }),
      catchError(() => this.tryEndpoints<T>(endpoints, type, idx + 1))
    );
  }

  private normalize<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    const x = value as any;
    return x?.content ?? x?.data ?? x?.sellers ?? x?.tables ?? x?.sessions ?? [];
  }
}
