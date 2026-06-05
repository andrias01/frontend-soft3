import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, map } from 'rxjs';

import { ENV } from '@config/env.config';
import {
  ApiErrorBody,
  Client,
  ClientAsyncResponse,
  ClientStatus,
  ClientStatusUpdateRequest,
  CreateClientRequest,
  UpdateClientRequest,
} from '@commercial/client/models/client.model';

const ASYNC_PROCESSING_DELAY_MS = 500;

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = ENV.apiUrl.replace(/\/api\/v1\/?$/, '');
  private readonly baseUrl = `${this.apiRoot}/commercial/api/v1/clients`;

  getClients(filters: {
    name?: string;
    email?: string;
    documentNumber?: string;
    active?: boolean;
    applyDiscounts?: boolean;
  } = {}): Observable<Client[]> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http
      .get<unknown>(this.baseUrl, { params })
      .pipe(map((response) => this.normalizeList(response)));
  }

  getClientById(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.baseUrl}/${id}`);
  }

  createClient(payload: CreateClientRequest): Observable<ClientAsyncResponse> {
    return this.http
      .post<ClientAsyncResponse>(this.baseUrl, payload)
      .pipe(delay(ASYNC_PROCESSING_DELAY_MS));
  }

  updateClient(id: string, payload: UpdateClientRequest): Observable<ClientAsyncResponse> {
    return this.http
      .put<ClientAsyncResponse>(`${this.baseUrl}/${id}`, payload)
      .pipe(delay(ASYNC_PROCESSING_DELAY_MS));
  }

  updateStatus(id: string, status: ClientStatus): Observable<ClientAsyncResponse> {
    const payload: ClientStatusUpdateRequest = { active: status === 'ACTIVE' };
    return this.http
      .patch<ClientAsyncResponse>(`${this.baseUrl}/${id}/status`, payload)
      .pipe(delay(ASYNC_PROCESSING_DELAY_MS));
  }

  private normalizeList(response: unknown): Client[] {
    if (Array.isArray(response)) {
      return response as Client[];
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const candidates = [response['content'], response['data'], response['clients']];
    const list = candidates.find(Array.isArray);

    return Array.isArray(list) ? (list as Client[]) : [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

export function getClientErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrio un error inesperado';
  }

  const body = error.error as ApiErrorBody | null;

  if (error.status === 400) {
    return body?.message ?? 'Solicitud no valida';
  }

  if (error.status === 401) {
    return 'Debes iniciar sesion para gestionar clientes';
  }

  if (error.status === 404) {
    return 'Cliente no encontrado';
  }

  if (error.status === 500) {
    return 'Error interno del servidor, intenta de nuevo';
  }

  return body?.message ?? 'Ocurrio un error inesperado';
}
