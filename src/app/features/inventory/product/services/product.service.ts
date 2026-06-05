import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductResponse, ProductRequest, ProductPatchRequest } from '../models/product.model';
import { ENV } from '@config/env.config';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/inventory/product';

  findAll(page: number = 0, size: number = 10, name?: string): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (name) {
      params = params.set('name', name);
    }
    
    return this.http.get<any>(this.baseUrl, { params });
  }

  findByLocation(locationId: string, page: number = 0, size: number = 10, name?: string): Observable<any> {
    let params = new HttpParams()
      .set('locationId', locationId)
      .set('page', page.toString())
      .set('size', size.toString());

    if (name) {
      params = params.set('name', name);
    }

    return this.http.get<any>(`${this.baseUrl}/location/${locationId}`, { params });
  }


  findById(id: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: ProductRequest): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(this.baseUrl, request);
  }

  update(id: string, request: ProductRequest): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${this.baseUrl}/${id}`, request);
  }

  patch(id: string, request: ProductPatchRequest): Observable<ProductResponse> {
    return this.http.patch<ProductResponse>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}