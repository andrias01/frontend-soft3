import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';
import {
  CashReceiptResponse,
  CreateCashReceiptRequest,
  PageResponse
} from '@payment/cashreceipt/models/cashreceipt.model';

/**
 * Servicio para el módulo CashReceipt.
 *
 * Endpoints consumidos de copiaPruebas (producer):
 *   GET  /api/v1/locations/{locationId}/cashreceipts          → lista paginada
 *   POST /api/v1/locations/{locationId}/cashreceipts          → crea recibo (publica evento)
 *   PATCH /api/v1/locations/{locationId}/cashreceipts/{id}/cancel → anula recibo
 */
@Injectable({ providedIn: 'root' })
export class CashReceiptService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = ENV.apiUrl;

  /**
   * Lista los recibos de caja de una sede con paginación.
   */
  getAll(locationId: string, page = 0, size = 10): Observable<PageResponse<CashReceiptResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<CashReceiptResponse>>(
      `${this.baseUrl}/locations/${locationId}/cashreceipts`,
      { params }
    );
  }

  /**
   * Obtiene los recibos de caja asociados a una factura específica.
   * El backend filtra por invoiceId y retorna un arreglo (sin paginación).
   */
  getByInvoice(locationId: string, invoiceId: string): Observable<CashReceiptResponse[]> {
    const params = new HttpParams().set('invoiceId', invoiceId);
    return this.http.get<CashReceiptResponse[]>(
      `${this.baseUrl}/locations/${locationId}/cashreceipts`,
      { params }
    );
  }

  /**
   * Crea un recibo de caja aplicando un pago a una factura.
   * El backend no persiste en la API; publica un comando a RabbitMQ y responde 202.
   *
   * Flujo de negocio:
   *  1. Se selecciona una factura (OPEN o PARTIALLY_PAID).
   *  2. Se elige un método de pago activo.
   *  3. Se indica el monto a pagar.
   *  4. El consumidor valida y persiste; puede cambiar el estado de la factura a PAID.
   */
  create(locationId: string, request: CreateCashReceiptRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/locations/${locationId}/cashreceipts`,
      request
    );
  }

  /**
   * Anula un recibo de caja.
   * El backend publica un comando a RabbitMQ y responde 202.
   */
  cancel(locationId: string, id: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/locations/${locationId}/cashreceipts/${id}/cancel`,
      {}
    );
  }
}
