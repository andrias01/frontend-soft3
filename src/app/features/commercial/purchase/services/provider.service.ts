import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';

export interface ProviderDTO {
  id: string;
  businessName: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class ProviderService {

  private url = `${ENV.apiUrl.replace('/api/v1', '')}/commercial/api/v1/providers`;

  constructor(private http: HttpClient) {}

  getActiveProviders(): Observable<ProviderDTO[]> {
    return this.http.get<ProviderDTO[]>(`${this.url}?status=ACTIVE`);
  }
}