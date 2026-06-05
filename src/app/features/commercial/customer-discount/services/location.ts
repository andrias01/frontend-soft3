import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';

export interface Location {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${ENV.apiUrl.replace('/api/v1', '')}/inventory/api/v1`;

  getById(id: string): Observable<Location> {
    return this.http.get<Location>(`${this.baseUrl}/location/${id}`);
  }
}