import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CategoryResponse,
  CategoryStatus,
  CategoryStatusUpdateRequest,
  CreateCategoryRequest
} from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/inventory/api/v1/categories';

  getAll(): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(this.baseUrl);
  }

  getByStatus(status: CategoryStatus): Observable<CategoryResponse[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<CategoryResponse[]>(this.baseUrl, { params });
  }

  getById(id: string): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`${this.baseUrl}/${id}`);
  }

  searchByName(name: string): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(`${this.baseUrl}/name/${encodeURIComponent(name)}`);
  }

  searchByType(type: string): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(`${this.baseUrl}/type/${encodeURIComponent(type)}`);
  }

  searchBySubtype(subtype: string): Observable<CategoryResponse[]> {
    return this.http.get<CategoryResponse[]>(`${this.baseUrl}/subtype/${encodeURIComponent(subtype)}`);
  }

  create(request: CreateCategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(this.baseUrl, request);
  }

  updateStatus(id: string, status: CategoryStatus): Observable<CategoryResponse> {
    const body: CategoryStatusUpdateRequest = { status };
    return this.http.patch<CategoryResponse>(`${this.baseUrl}/${id}/status`, body);
  }
}
