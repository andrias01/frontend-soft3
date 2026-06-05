import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';

export interface Client {
  id: string;
  firstName: string;
  firstLastName: string;
  documentNumber: string;
}

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly url  = `${ENV.apiUrl.replace('/api/v1', '')}/commercial/api/v1/clients`;

  getAll(): Observable<Client[]> {
    return this.http.get<Client[]>(this.url);
  }

  getAllActive(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.url}?active=true&applyDiscounts=true`);
  }
}