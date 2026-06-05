import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CashReceiptService } from '@payment/cashreceipt/services/cash-receipt.service';
import { PaymentMethodService } from '@payment/paymentmethod/services/payment-method.service';
import { InvoiceService } from '@payment/invoice/services/invoice.service';
import {
  CreateCashReceiptRequest,
  CashReceiptResponse,
  InvoiceResponse
} from '@payment/cashreceipt/models/cashreceipt.model';
import { PaymentMethodResponse } from '@payment/paymentmethod/models/payment-method.model';
import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';

const BLOCKED_STATUSES = new Set(['PAID', 'CANCELLED', 'VOIDED']);
const TABLES_ENDPOINT = `${ENV.apiUrl.replace(/\/api\/v1\/?$/, '')}/commercial/api/v1/tables`;

interface InvoiceWithReceipts extends InvoiceResponse {
  receipts?: CashReceiptResponse[];
  receiptsLoaded?: boolean;
  receiptsExpanded?: boolean;
}

@Component({
  selector: 'app-cash-receipt-create',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <a class="back-link" routerLink="..">← Volver a recibos</a>
        <h1 class="page-title">Nuevo Recibo de Caja</h1>
        <p class="page-subtitle">
          Selecciona una factura, elige el método de pago e ingresa el monto a aplicar.
        </p>
      </div>
    </div>

    <div class="form-layout">

      <!-- ══════════ STEP 1: INVOICE BROWSER ══════════ -->
      <div class="form-card">
        <div class="step-header">
          <span class="step-number" [class.completed]="selectedInvoice()">{{ selectedInvoice() ? '✓' : '1' }}</span>
          <div class="step-title-wrap">
            <h2>Datos de la Factura</h2>
            <span class="step-hint" *ngIf="!selectedInvoice()">Busca y selecciona una factura</span>
            <span class="step-hint selected" *ngIf="selectedInvoice()">
              Factura {{ selectedInvoice()?.invoiceNumber }} seleccionada
            </span>
          </div>
          <button class="btn-change" *ngIf="selectedInvoice()" (click)="clearSelectedInvoice()">Cambiar</button>
        </div>

        <!-- Selected invoice summary -->
        @if (selectedInvoice()) {
          <div class="selected-invoice-card">
            <div class="sic-row">
              <span class="sic-number">{{ selectedInvoice()!.invoiceNumber }}</span>
              <span class="badge" [class]="'badge-' + selectedInvoice()!.status">
                {{ statusLabel(selectedInvoice()!.status) }}
              </span>
            </div>
            <div class="sic-meta">
              <span>Total: <strong>{{ selectedInvoice()!.totalPrice | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></span>
              <span>Descuento: <strong>{{ selectedInvoice()!.discountAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></span>
              <span>Fecha: {{ selectedInvoice()!.invoiceDate | date:'dd/MM/yyyy' }}</span>
            </div>
        <!-- Business rule: blocked invoice -->
          @if (isSelectedInvoiceBlocked()) {
            <div class="alert-blocked">
              <strong>⚠️ Esta factura no admite pagos</strong>
              <p>Estado actual: <strong>{{ statusLabel(selectedInvoice()!.status) }}</strong>. Solo se pueden pagar facturas en estado <em>Abierta</em> o <em>Pago parcial</em>.</p>
            </div>
          }

          @if (selectedInvoice()!.receipts && selectedInvoice()!.receipts!.length > 0) {
              <div class="sic-payments">
                <p class="payments-title">Pagos aplicados ({{ selectedInvoice()!.receipts!.length }}):</p>
                @for (r of selectedInvoice()!.receipts!; track r.id) {
                  <div class="payment-row">
                    <span class="payment-method">{{ r.paymentMethodName }}</span>
                    <span class="payment-amount">{{ r.amount | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                    <span class="payment-badge" [class.cancelled]="r.status === 'CANCELLED'">{{ r.status === 'CANCELLED' ? 'Anulado' : 'Activo' }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Invoice search panel -->
        @if (!selectedInvoice()) {
          <div class="invoice-panel">
            <!-- Filters -->
            <div class="filter-bar">
              <div class="search-wrap">
                <span class="search-icon">🔍</span>
                <input
                  id="invoiceSearch"
                  type="text"
                  class="search-input"
                  placeholder="Buscar por número de factura..."
                  [(ngModel)]="searchText"
                  (ngModelChange)="onSearchChange()">
              </div>
              <div class="status-filters">
                @for (s of statusOptions; track s.value) {
                  <button
                    class="filter-chip"
                    [class.active]="selectedStatus() === s.value"
                    (click)="setStatus(s.value)">
                    {{ s.label }}
                  </button>
                }
              </div>
            </div>

            <!-- Invoice list -->
            @if (loadingInvoices()) {
              <div class="loading-wrap">
                <div class="spinner"></div>
                <span>Cargando facturas…</span>
              </div>
            } @else if (filteredInvoices().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📄</span>
                <p>No se encontraron facturas con los filtros aplicados.</p>
              </div>
            } @else {
              <div class="invoice-list">
                @for (inv of filteredInvoices(); track inv.invoiceId) {
                  <div class="invoice-item" [class.selecting]="expandedInvoiceId() === inv.invoiceId">
                    <div class="invoice-item-main" (click)="toggleExpand(inv)">
                      <div class="inv-left">
                        <span class="inv-number">{{ inv.invoiceNumber }}</span>
                        <span class="badge" [class]="'badge-' + inv.status">{{ statusLabel(inv.status) }}</span>
                      </div>
                      <div class="inv-center">
                        <span class="inv-total">{{ inv.totalPrice | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                        <span class="inv-date">{{ inv.invoiceDate | date:'dd/MM/yyyy' }}</span>
                      </div>
                      <div class="inv-right">
                        @if (!inv.receiptsLoaded) {
                          <span class="receipts-badge loading">Cargando…</span>
                        } @else if (inv.receipts!.length === 0) {
                          <span class="receipts-badge none">Sin pagos</span>
                        } @else {
                          <span class="receipts-badge has-payments">{{ inv.receipts!.length }} pago(s)</span>
                        }
                        <span class="expand-icon">{{ expandedInvoiceId() === inv.invoiceId ? '▲' : '▼' }}</span>
                      </div>
                    </div>

                    <!-- Expanded receipts detail -->
                    @if (expandedInvoiceId() === inv.invoiceId) {
                      <div class="invoice-item-detail">
                        @if (!inv.receiptsLoaded) {
                          <p class="detail-loading">Cargando pagos…</p>
                        } @else if (inv.receipts!.length === 0) {
                          <p class="detail-empty">Esta factura no tiene pagos registrados.</p>
                        } @else {
                          <table class="receipts-table">
                            <thead>
                              <tr>
                                <th>Método</th>
                                <th>Monto</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (r of inv.receipts!; track r.id) {
                                <tr [class.cancelled-row]="r.status === 'CANCELLED'">
                                  <td>{{ r.paymentMethodName }}</td>
                                  <td>{{ r.amount | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                                  <td>{{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                                  <td>
                                    <span class="payment-badge" [class.cancelled]="r.status === 'CANCELLED'">
                                      {{ r.status === 'CANCELLED' ? 'Anulado' : 'Activo' }}
                                    </span>
                                  </td>
                                  <td>
                                    @if (r.status === 'PAID') {
                                      <button
                                        class="btn-danger-xs"
                                        [disabled]="cancellingReceiptId() === r.id"
                                        (click)="cancelReceiptFromCreate(r.id, inv)">
                                        Anular
                                      </button>
                                    }
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                        <button class="btn-select-invoice" (click)="selectInvoice(inv)">
                          ✓ Seleccionar esta factura
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Pagination -->
              @if (totalPages() > 1) {
                <div class="pagination">
                  <button class="page-btn" [disabled]="currentPage() === 0" (click)="goPage(currentPage() - 1)">‹ Anterior</button>
                  <span class="page-info">Página {{ currentPage() + 1 }} de {{ totalPages() }}</span>
                  <button class="page-btn" [disabled]="currentPage() >= totalPages() - 1" (click)="goPage(currentPage() + 1)">Siguiente ›</button>
                </div>
              }
            }
          </div>
        }
      </div>

      <!-- ══════════ STEP 2 & 3: PAYMENT ══════════ -->
      @if (selectedInvoice()) {
        <div class="form-card">
          <div class="step-header">
            <span class="step-number">2</span>
            <h2>Método de Pago</h2>
          </div>
          @if (loadingMethods()) {
            <p class="loading-text">Cargando métodos de pago…</p>
          } @else {
            <div class="method-grid">
              @for (method of paymentMethods(); track method.id) {
                <button
                  [class]="'method-card' + (selectedMethodId() === method.id ? ' selected' : '') + (!method.active ? ' disabled' : '')"
                  [disabled]="!method.active"
                  (click)="selectMethod(method.id)">
                  <span class="method-name">{{ method.name }}</span>
                  <span class="method-desc">{{ method.description }}</span>
                  @if (!method.active) {
                    <span class="method-inactive">Inactivo</span>
                  }
                </button>
              }
            </div>
          }
        </div>

        <div class="form-card">
          <div class="step-header">
            <span class="step-number">3</span>
            <h2>Monto a Pagar</h2>
          </div>
          <div class="field-group">
            <label for="amount">Valor del pago</label>
            <input
              id="amount"
              type="number"
              class="input input-amount"
              placeholder="0.00"
              min="0.01"
              [(ngModel)]="amount">
            <div class="amount-info">
              @if (pendingBalance() > 0) {
                <span class="amount-hint">Saldo pendiente: <strong>{{ pendingBalance() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></span>
              }
              @if (selectedInvoice()!.totalPrice) {
                <span class="amount-hint secondary">Total factura: {{ selectedInvoice()!.totalPrice | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
              }
            </div>
            @if (amount > 0 && amount > pendingBalance() && pendingBalance() > 0) {
              <div class="alert-warn-inline">
                ⚠️ El monto ingresado ({{ amount | currency:'COP':'symbol-narrow':'1.0-0' }}) supera el saldo pendiente ({{ pendingBalance() | currency:'COP':'symbol-narrow':'1.0-0' }}).
              </div>
            }
          </div>
        </div>

        <div class="form-actions">
          @if (submitError()) {
            <div class="alert-error">{{ submitError() }}</div>
          }
          @if (successMsg()) {
            <div class="alert-success">{{ successMsg() }}</div>
          }
          <button
            class="btn-primary"
            [disabled]="submitting() || !selectedInvoice() || !selectedMethodId() || amount <= 0 || isSelectedInvoiceBlocked()"
            (click)="submit()">
            {{ submitting() ? 'Procesando…' : 'Aplicar Pago' }}
          </button>
          <a class="btn-ghost" routerLink="..">Cancelar</a>
        </div>
      }
    </div>

    <!-- Custom Modal -->
    @if (modalMessage()) {
      <div class="modal-backdrop">
        <div class="modal-container">
          <div class="modal-header">
            <h3>⚠️ Notificación</h3>
          </div>
          <div class="modal-body">
            <p>{{ modalMessage() }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-modal-ok" (click)="modalMessage.set(null)">Aceptar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ─── Layout ─── */
    .page-header { margin-bottom: 2rem; }
    .back-link { display: inline-block; margin-bottom: 0.75rem; font-size: 0.875rem; color: var(--color-primary); text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .page-title { font-size: 1.75rem; font-weight: 700; color: var(--color-secondary); margin: 0 0 0.25rem 0; }
    .page-subtitle { color: #64748b; margin: 0; font-size: 0.9375rem; max-width: 680px; }
    .form-layout { display: flex; flex-direction: column; gap: 1.5rem; max-width: 800px; }

    /* ─── Card ─── */
    .form-card { background: white; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }

    /* ─── Step header ─── */
    .step-header { display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.875rem; }
    .step-number { width: 30px; height: 30px; background: var(--color-background); color: var(--color-primary); border-radius: 50%; border: 2px solid var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; flex-shrink: 0; transition: all 0.2s; }
    .step-number.completed { background: #22c55e; color: white; border-color: #22c55e; }
    .btn-change { background: none; border: 1px solid #cbd5e1; color: #475569; border-radius: 0.375rem; padding: 0.25rem 0.75rem; font-size: 0.8125rem; cursor: pointer; }
    .btn-change:hover { border-color: var(--color-primary); color: var(--color-primary); }

    /* ─── Selected invoice card ─── */
    .selected-invoice-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.625rem; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.625rem; }
    .sic-row { display: flex; align-items: center; gap: 0.75rem; }
    .sic-number { font-size: 1.05rem; font-weight: 700; color: #1e293b; }
    .sic-meta { display: flex; gap: 1.5rem; font-size: 0.875rem; color: #64748b; flex-wrap: wrap; }
    .sic-meta strong { color: #1e293b; }
    .sic-payments { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.375rem; }
    .payments-title { font-size: 0.8125rem; font-weight: 600; color: #475569; margin: 0 0 0.25rem 0; }
    .payment-row { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8125rem; }
    .payment-method { color: #475569; flex: 1; }
    .payment-amount { font-weight: 600; color: #1e293b; }

    /* ─── Invoice panel ─── */
    .invoice-panel { display: flex; flex-direction: column; gap: 1rem; }

    /* ─── Filter bar ─── */
    .filter-bar { display: flex; flex-direction: column; gap: 0.75rem; }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 1rem; pointer-events: none; }
    .search-input { width: 100%; padding: 0.625rem 0.875rem 0.625rem 2.25rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem; color: #1e293b; box-sizing: border-box; transition: border-color 0.2s; }
    .search-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(255,107,53,0.15); }
    .status-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-chip { padding: 0.375rem 0.875rem; border: 1px solid #e2e8f0; border-radius: 999px; background: white; color: #64748b; font-size: 0.8125rem; cursor: pointer; transition: all 0.15s; font-weight: 500; }
    .filter-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .filter-chip.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

    /* ─── Loading / empty ─── */
    .loading-wrap { display: flex; align-items: center; gap: 0.75rem; color: #64748b; padding: 1.5rem; }
    .spinner { width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: #94a3b8; text-align: center; }
    .empty-icon { font-size: 2rem; }

    /* ─── Invoice list ─── */
    .invoice-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .invoice-item { border: 1px solid #e2e8f0; border-radius: 0.625rem; overflow: hidden; transition: border-color 0.15s; }
    .invoice-item:hover { border-color: #cbd5e1; }
    .invoice-item.selecting { border-color: var(--color-primary); }
    .invoice-item-main { display: flex; align-items: center; gap: 1rem; padding: 0.875rem 1rem; cursor: pointer; background: white; transition: background 0.15s; user-select: none; }
    .invoice-item-main:hover { background: #f8fafc; }
    .inv-left { display: flex; align-items: center; gap: 0.625rem; flex: 1; min-width: 0; }
    .inv-number { font-weight: 700; font-size: 0.9375rem; color: #1e293b; white-space: nowrap; }
    .inv-center { display: flex; flex-direction: column; align-items: flex-end; flex: 1; }
    .inv-total { font-weight: 600; color: #1e293b; font-size: 0.9375rem; }
    .inv-date { font-size: 0.8125rem; color: #94a3b8; }
    .inv-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .expand-icon { color: #94a3b8; font-size: 0.75rem; }

    /* ─── Receipts badge ─── */
    .receipts-badge { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .receipts-badge.loading { background: #f1f5f9; color: #94a3b8; }
    .receipts-badge.none { background: #f1f5f9; color: #94a3b8; }
    .receipts-badge.has-payments { background: #dbeafe; color: #1d4ed8; }

    /* ─── Status badges ─── */
    .badge { padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    .badge-OPEN { background: #dcfce7; color: #15803d; }
    .badge-PARTIALLY_PAID { background: #fef9c3; color: #a16207; }
    .badge-PAID { background: #dbeafe; color: #1d4ed8; }
    .badge-CANCELLED { background: #fee2e2; color: #dc2626; }
    .badge-PENDING { background: #f1f5f9; color: #475569; }
    .badge-CLOSED { background: #f1f5f9; color: #475569; }
    .badge-VOIDED { background: #fce7f3; color: #be185d; }

    /* ─── Payment badge ─── */
    .payment-badge { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; background: #dcfce7; color: #15803d; }
    .payment-badge.cancelled { background: #fee2e2; color: #dc2626; }
    .cancelled-row { opacity: 0.55; }

    /* ─── Invoice item detail ─── */
    .invoice-item-detail { padding: 1rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.75rem; }
    .detail-loading, .detail-empty { font-size: 0.875rem; color: #94a3b8; margin: 0; }

    /* ─── Receipts table ─── */
    .receipts-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .receipts-table th { text-align: left; color: #64748b; font-weight: 600; padding: 0.375rem 0.5rem; border-bottom: 1px solid #e2e8f0; }
    .receipts-table td { padding: 0.4rem 0.5rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .receipts-table tbody tr:last-child td { border-bottom: none; }
    .btn-danger-xs { background: #fee2e2; color: #dc2626; border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .btn-danger-xs:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger-xs:not(:disabled):hover { background: #fecaca; }

    /* ─── Select invoice button ─── */
    .btn-select-invoice { margin-top: 0.25rem; background: var(--color-primary); color: white; border: none; border-radius: 0.5rem; padding: 0.625rem 1.25rem; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.2s; align-self: flex-start; }
    .btn-select-invoice:hover { background: var(--color-accent, #e05a22); }

    /* ─── Pagination ─── */
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; padding-top: 0.5rem; }
    .page-btn { background: white; border: 1px solid #e2e8f0; color: #475569; padding: 0.4rem 0.875rem; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btn:not(:disabled):hover { border-color: var(--color-primary); color: var(--color-primary); }
    .page-info { font-size: 0.875rem; color: #64748b; }

    /* ─── Fields ─── */
    .field-group { display: flex; flex-direction: column; gap: 0.5rem; }
    label { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .input { padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 0.9375rem; color: #1e293b; transition: border-color 0.2s; }
    .input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(255,107,53,0.2); }
    .input-amount { max-width: 200px; }
    .amount-hint { font-size: 0.8125rem; color: #64748b; }
    .alert-warn-inline { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 0.5rem 0.75rem; border-radius: 0.375rem; font-size: 0.8125rem; }

    /* ─── Method grid ─── */
    .method-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
    .method-card { display: flex; flex-direction: column; gap: 0.25rem; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 0.625rem; background: white; cursor: pointer; text-align: left; transition: border-color 0.2s, background 0.2s; }
    .method-card:hover:not(.disabled) { border-color: var(--color-accent); background: var(--color-background); }
    .method-card.selected { border-color: var(--color-primary); background: var(--color-background); }
    .method-card.disabled { opacity: 0.45; cursor: not-allowed; }
    .method-name { font-weight: 600; font-size: 0.9375rem; color: #1e293b; }
    .method-desc { font-size: 0.8125rem; color: #64748b; }
    .method-inactive { font-size: 0.75rem; color: #dc2626; font-weight: 600; }

    /* ─── Actions ─── */
    .form-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .btn-primary { background: var(--color-primary); color: white; padding: 0.65rem 1.75rem; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 0.9375rem; cursor: pointer; transition: background 0.2s; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: none; border: none; color: var(--color-primary); font-size: 0.875rem; cursor: pointer; padding: 0.625rem 0.5rem; text-decoration: none; }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; width: 100%; }
    .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; width: 100%; }
    .loading-text { color: #64748b; font-size: 0.9375rem; }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal-container {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      width: 90%;
      max-width: 450px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: 1px solid #e2e8f0;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header h3 {
      margin: 0;
      color: #ea580c;
      font-size: 1.25rem;
    }
    .modal-body p {
      margin: 0;
      color: #334155;
      line-height: 1.5;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
    }
    .btn-modal-ok {
      background: #ea580c;
      color: white;
      border: none;
      padding: 0.6rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-modal-ok:hover {
      background: #c2410c;
    }
  `]
})
export class CashReceiptCreateComponent implements OnInit {
  private readonly service = inject(CashReceiptService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly invoiceService = inject(InvoiceService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  protected readonly locationId = this.authService.getLocationId() || ENV.locationId;

  // ── Form state ──
  protected amount = 0;
  protected searchText = '';

  // ── Signals ──
  protected readonly paymentMethods = signal<PaymentMethodResponse[]>([]);
  protected readonly selectedMethodId = signal<string | null>(null);
  protected readonly loadingMethods = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly successMsg = signal<string | null>(null);
  protected readonly cancellingReceiptId = signal<string | null>(null);
  protected readonly modalMessage = signal<string | null>(null);

  // ── Invoice signals ──
  protected readonly allInvoices = signal<InvoiceWithReceipts[]>([]);
  protected readonly loadingInvoices = signal(false);
  protected readonly selectedInvoice = signal<InvoiceWithReceipts | null>(null);
  protected readonly selectedStatus = signal<string>('ALL');
  protected readonly expandedInvoiceId = signal<string | null>(null);
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  private readonly pageSize = 20;

  readonly statusOptions = [
    { value: 'ALL', label: 'Todas' },
    { value: 'OPEN', label: 'Abiertas' },
    { value: 'PARTIALLY_PAID', label: 'Pago parcial' },
    { value: 'PAID', label: 'Pagadas' },
    { value: 'CANCELLED', label: 'Canceladas' },
  ];

  // ── Computed filtered list ──
  protected readonly filteredInvoices = computed(() => {
    const q = this.searchText.toLowerCase().trim();
    const status = this.selectedStatus();
    return this.allInvoices().filter(inv => {
      // Filtro por estado (cliente, además del filtro backend)
      if (status !== 'ALL' && inv.status !== status) return false;
      // Filtro por texto de búsqueda
      if (q && !(inv.invoiceNumber ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  });

  // Saldo pendiente: total factura menos pagos activos ya aplicados
  protected readonly pendingBalance = computed(() => {
    const inv = this.selectedInvoice();
    if (!inv) return 0;
    const total = inv.totalPrice ?? 0;
    const paid = (inv.receipts ?? [])
      .filter(r => r.status === 'PAID')
      .reduce((s, r) => s + r.amount, 0);
    return Math.max(total - paid, 0);
  });

  // Si la factura está en un estado que no permite pagos
  protected readonly isSelectedInvoiceBlocked = computed(() => {
    const inv = this.selectedInvoice();
    if (!inv) return false;
    return BLOCKED_STATUSES.has(inv.status);
  });

  ngOnInit(): void {
    this.loadPaymentMethods();
    this.loadInvoices();
  }

  // ───── Status label ─────
  protected statusLabel(status: string): string {
    const map: Record<string, string> = {
      OPEN: 'Abierta',
      PARTIALLY_PAID: 'Pago parcial',
      PAID: 'Pagada',
      CANCELLED: 'Cancelada',
      PENDING: 'Pendiente',
      CLOSED: 'Cerrada',
      VOIDED: 'Anulada'
    };
    return map[status] ?? status;
  }

  // ───── Invoice loading ─────
  private loadInvoices(): void {
    this.loadingInvoices.set(true);
    const status = this.selectedStatus();
    const obs = status === 'ALL'
      ? this.invoiceService.getInvoicesByLocation(this.locationId, this.currentPage(), this.pageSize)
      : this.invoiceService.getInvoicesByStatus(this.locationId, status, this.currentPage(), this.pageSize);

    obs.subscribe({
      next: (page) => {
        const invoices: InvoiceWithReceipts[] = (page.content as unknown as InvoiceResponse[]).map(inv => ({
          ...inv,
          receipts: [],
          receiptsLoaded: false,
          receiptsExpanded: false
        }));
        this.allInvoices.set(invoices);
        this.totalPages.set(page.totalPages);
        this.loadingInvoices.set(false);
        // preload receipts for all invoices
        invoices.forEach(inv => this.loadReceiptsFor(inv));
      },
      error: () => {
        this.loadingInvoices.set(false);
      }
    });
  }

  private hydratePaymentMethodNames(receipts: CashReceiptResponse[]): void {
    const methods = this.paymentMethods();
    if (methods.length > 0) {
      receipts.forEach(r => {
        if (!r.paymentMethodName && r.paymentMethodId) {
          const match = methods.find(m => m.id === r.paymentMethodId);
          r.paymentMethodName = match ? match.name : 'Método';
        }
      });
    } else {
      this.paymentMethodService.getActive().subscribe({
        next: (activeMethods) => {
          this.paymentMethods.set(activeMethods);
          receipts.forEach(r => {
            if (!r.paymentMethodName && r.paymentMethodId) {
              const match = activeMethods.find(m => m.id === r.paymentMethodId);
              r.paymentMethodName = match ? match.name : 'Método';
            }
          });
        }
      });
    }
  }

  private loadReceiptsFor(inv: InvoiceWithReceipts): void {
    this.service.getByInvoice(this.locationId, inv.invoiceId).subscribe({
      next: (receipts) => {
        const list = Array.isArray(receipts)
          ? (receipts as CashReceiptResponse[])
          : (receipts as any).content ?? [];
        this.hydratePaymentMethodNames(list);
        this.allInvoices.update(all =>
          all.map(i => i.invoiceId === inv.invoiceId
            ? { ...i, receipts: list, receiptsLoaded: true }
            : i
          )
        );
      },
      error: () => {
        this.allInvoices.update(all =>
          all.map(i => i.invoiceId === inv.invoiceId ? { ...i, receipts: [], receiptsLoaded: true } : i)
        );
      }
    });
  }

  protected cancelReceiptFromCreate(id: string, inv: InvoiceWithReceipts): void {
    if (!confirm('¿Deseas anular este recibo de caja?')) return;
    this.cancellingReceiptId.set(id);
    this.service.cancel(this.locationId, id).subscribe({
      next: () => {
        this.cancellingReceiptId.set(null);
        // Optimistic UI update
        this.allInvoices.update(list =>
          list.map(i => i.invoiceId === inv.invoiceId
            ? {
                ...i,
                receipts: (i.receipts ?? []).map(r => r.id === id ? { ...r, status: 'CANCELLED' as const } : r)
              }
            : i
          )
        );
        // Poll backend
        this.pollReceiptCancellationFromCreate(id, inv, 0);
      },
      error: (err) => {
        this.cancellingReceiptId.set(null);
        const body = err?.error;
        this.modalMessage.set(body?.message ?? body?.error ?? 'Error al anular el recibo.');
      }
    });
  }

  private pollReceiptCancellationFromCreate(id: string, inv: InvoiceWithReceipts, attempt: number): void {
    if (attempt >= 5) return;
    setTimeout(() => {
      this.service.getByInvoice(this.locationId, inv.invoiceId).subscribe({
        next: (receipts) => {
          const list = Array.isArray(receipts)
            ? (receipts as CashReceiptResponse[])
            : (receipts as any).content ?? [];
          const found = list.find((r: CashReceiptResponse) => r.id === id);
          if (found && found.status === 'CANCELLED') {
            this.loadReceiptsFor(inv);
          } else {
            this.pollReceiptCancellationFromCreate(id, inv, attempt + 1);
          }
        }
      });
    }, 2000);
  }

  // ───── Filters & pagination ─────
  protected setStatus(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(0);
    this.searchText = '';
    this.loadInvoices();
  }

  protected onSearchChange(): void {
    // filtering is done on computed signal; no reload needed
  }

  protected goPage(page: number): void {
    this.currentPage.set(page);
    this.loadInvoices();
  }

  // ───── Invoice selection ─────
  protected toggleExpand(inv: InvoiceWithReceipts): void {
    this.expandedInvoiceId.set(
      this.expandedInvoiceId() === inv.invoiceId ? null : inv.invoiceId
    );
  }

  protected selectInvoice(inv: InvoiceWithReceipts): void {
    this.selectedInvoice.set(inv);
    this.expandedInvoiceId.set(null);
  }

  protected clearSelectedInvoice(): void {
    this.selectedInvoice.set(null);
  }

  // ───── Payment ─────
  protected selectMethod(id: string): void {
    this.selectedMethodId.set(id);
  }

  protected submit(): void {
    const inv = this.selectedInvoice();
    const paymentMethodId = this.selectedMethodId();
    if (!inv || !paymentMethodId || this.amount <= 0) return;
    if (this.isSelectedInvoiceBlocked()) return;

    this.submitting.set(true);
    this.submitError.set(null);
    this.successMsg.set(null);

    const request: CreateCashReceiptRequest = {
      invoiceId: inv.invoiceId,
      paymentMethodId,
      amount: this.amount
    };

    this.service.create(this.locationId, request).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.successMsg.set(
          `${res.message} — el sistema procesará el pago, actualizará la factura y liberará la mesa automáticamente.`
        );
        setTimeout(() => this.router.navigate(['/payment/cashreceipt']), 3000);
      },
      error: (err) => {
        this.submitting.set(false);
        const body = err?.error;
        const msg = body?.message ?? body?.error ?? 'Error al procesar el pago.';
        const detail = body?.details ?? body?.detail ?? null;
        this.submitError.set(detail ? `${msg} — ${detail}` : msg);
      }
    });
  }

  private loadPaymentMethods(): void {
    this.loadingMethods.set(true);
    this.paymentMethodService.getActive().subscribe({
      next: (methods) => {
        this.paymentMethods.set(methods);
        this.loadingMethods.set(false);
      },
      error: () => {
        this.loadingMethods.set(false);
      }
    });
  }
}
