import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '../../../../core/config/env.config';
import {
  InvoiceAcceptedResponse,
  InvoiceRequest,
  InvoiceResponse,
  InvoiceStatus,
  InvoiceStatusUpdateRequest,
  PageResponse
} from '../models/invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = ENV.apiUrl;

  createInvoice(locationId: string, request: InvoiceRequest): Observable<InvoiceAcceptedResponse> {
    return this.http.post<InvoiceAcceptedResponse>(
      `${this.baseUrl}/locations/${locationId}/invoices`,
      request
    );
  }

  getInvoicesByLocation(
    locationId: string,
    page = 0,
    size = 10
  ): Observable<PageResponse<InvoiceResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<InvoiceResponse>>(
      `${this.baseUrl}/locations/${locationId}/invoices`,
      { params }
    );
  }

  getInvoicesByStatus(
    locationId: string,
    status: string,
    page = 0,
    size = 50
  ): Observable<PageResponse<InvoiceResponse>> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<InvoiceResponse>>(
      `${this.baseUrl}/locations/${locationId}/invoices`,
      { params }
    );
  }

  getInvoiceById(locationId: string, invoiceId: string): Observable<InvoiceResponse> {
    return this.http.get<InvoiceResponse>(
      `${this.baseUrl}/locations/${locationId}/invoices/${invoiceId}`
    );
  }

  updateInvoiceStatus(
    locationId: string,
    invoiceId: string,
    status: InvoiceStatus | string
  ): Observable<InvoiceAcceptedResponse | InvoiceResponse> {
    const request: InvoiceStatusUpdateRequest = { status };

    return this.http.patch<InvoiceAcceptedResponse | InvoiceResponse>(
      `${this.baseUrl}/locations/${locationId}/invoices/${invoiceId}/status`,
      request
    );
  }
}
