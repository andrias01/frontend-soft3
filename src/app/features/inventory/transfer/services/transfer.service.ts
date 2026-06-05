import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';
import {
  CreateTransferRequest,
  TransferClaimRequest,
  TransferResponse,
  TransferStatusUpdateRequest
} from '../models/transfer.model';

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/inventory/api/v1/transfers';

  getAll(): Observable<TransferResponse[]> {
    return this.http.get<TransferResponse[]>(this.baseUrl);
  }

  getInTransit(): Observable<TransferResponse[]> {
    return this.http.get<TransferResponse[]>(`${this.baseUrl}/in-transit`);
  }

  getCompleted(): Observable<TransferResponse[]> {
    return this.http.get<TransferResponse[]>(`${this.baseUrl}/completed`);
  }

  getCancelled(): Observable<TransferResponse[]> {
    return this.http.get<TransferResponse[]>(`${this.baseUrl}/cancelled`);
  }

  getClaimed(): Observable<TransferResponse[]> {
    return this.http.get<TransferResponse[]>(`${this.baseUrl}/claimed`);
  }

  getIncoming(sedeDestino: string): Observable<TransferResponse[]> {
    const params = new HttpParams().set('sedeDestino', sedeDestino);
    return this.http.get<TransferResponse[]>(`${this.baseUrl}/incoming`, { params });
  }

  findById(id: number): Observable<TransferResponse> {
    return this.http.get<TransferResponse>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTransferRequest): Observable<TransferResponse> {
    return this.http.post<TransferResponse>(this.baseUrl, request);
  }

  sendToTransit(id: number, sedeOrigen: string): Observable<TransferResponse> {
    const params = new HttpParams().set('sedeOrigen', sedeOrigen);
    const body: TransferStatusUpdateRequest = { estado: 'EN_TRANSITO' };
    return this.http.patch<TransferResponse>(`${this.baseUrl}/${id}/status`, body, { params });
  }

  cancel(id: number, sedeOrigen: string): Observable<TransferResponse> {
    const params = new HttpParams().set('sedeOrigen', sedeOrigen);
    const body: TransferStatusUpdateRequest = { estado: 'CANCELADO' };
    return this.http.patch<TransferResponse>(`${this.baseUrl}/${id}/status`, body, { params });
  }

  confirm(id: number, sedeDestino: string): Observable<TransferResponse> {
    const params = new HttpParams().set('sedeDestino', sedeDestino);
    return this.http.patch<TransferResponse>(`${this.baseUrl}/${id}/confirm`, {}, { params });
  }

  claim(
    id: number,
    sedeDestino: string,
    request: TransferClaimRequest
  ): Observable<TransferResponse> {
    const params = new HttpParams().set('sedeDestino', sedeDestino);
    return this.http.patch<TransferResponse>(`${this.baseUrl}/${id}/claim`, request, { params });
  }
}
