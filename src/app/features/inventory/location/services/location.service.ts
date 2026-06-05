import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocationPatchRequest, LocationRequest, LocationResponse } from '../models/location.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly baseUrl = '/inventory/api/v1/location';

  constructor(private readonly http: HttpClient) {}

  list(): Observable<LocationResponse[]> {
    return this.http.get<LocationResponse[]>(this.baseUrl);
  }

  listActive(): Observable<LocationResponse[]> {
    return this.http.get<LocationResponse[]>(`${this.baseUrl}/active`);
  }

  getById(id: string): Observable<LocationResponse> {
    return this.http.get<LocationResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: LocationRequest): Observable<unknown> {
    return this.http.post(this.baseUrl, request);
  }

  update(id: string, request: LocationRequest): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}`, request);
  }

  updateStatus(id: string, request: LocationPatchRequest): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/editar/${id}`, request);
  }
}
