import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, map } from 'rxjs';

import { ENV } from '@config/env.config';
import {
  ApiErrorBody,
  CreateProviderRequest,
  Provider,
  ProviderStatus,
  UpdateProviderRequest,
  UpdateProviderStatusRequest,
} from '@commercial/provider/models/provider.model';

const ASYNC_PROCESSING_DELAY_MS = 500;

@Injectable({ providedIn: 'root' })
export class ProvidersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${ENV.apiUrl.replace('/api/v1', '')}/commercial/api/v1/providers`;

  getProviders(status?: ProviderStatus): Observable<Provider[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;

    return this.http
      .get<unknown>(this.baseUrl, params ? { params } : undefined)
      .pipe(map((response) => this.normalizeList(response)));
  }

  getProviderById(id: string): Observable<Provider> {
    return this.http.get<Provider>(`${this.baseUrl}/${id}`);
  }

  createProvider(payload: CreateProviderRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl, payload).pipe(delay(ASYNC_PROCESSING_DELAY_MS));
  }

  updateProvider(id: string, payload: UpdateProviderRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload).pipe(delay(ASYNC_PROCESSING_DELAY_MS));
  }

  updateStatus(id: string, status: ProviderStatus): Observable<void> {
    const payload: UpdateProviderStatusRequest = { status };
    return this.http
      .patch<void>(`${this.baseUrl}/${id}/status`, payload)
      .pipe(delay(ASYNC_PROCESSING_DELAY_MS));
  }

  private normalizeList(response: unknown): Provider[] {
    if (Array.isArray(response)) {
      return response as Provider[];
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const candidates = [response['content'], response['data'], response['providers']];
    const list = candidates.find(Array.isArray);

    return Array.isArray(list) ? (list as Provider[]) : [];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

export function getProviderErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrió un error inesperado';
  }

  const body = error.error as ApiErrorBody | null;

  if (error.status === 400) {
    return body?.message ?? 'Solicitud no válida';
  }

  if (error.status === 404) {
    return 'Proveedor no encontrado';
  }

  if (error.status === 500) {
    return 'Error interno del servidor, intenta de nuevo';
  }

  return body?.message ?? 'Ocurrió un error inesperado';
}
