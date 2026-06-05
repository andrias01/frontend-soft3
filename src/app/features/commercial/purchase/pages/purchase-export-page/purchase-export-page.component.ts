import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';
import { ProviderService, ProviderDTO } from '../../services/provider.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type ExportStatus = 'idle' | 'loading-preview' | 'loading-pdf' | 'loading-excel' | 'loading-email' | 'email-sent' | 'error';

@Component({
  selector: 'app-purchase-export-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="export-page">

      <!-- HEADER -->
      <header class="page-header">
        <button class="btn-back" (click)="goBack()">← Volver</button>
        <div>
          <h1>Exportar Compras</h1>
          <p class="subtitle">Previsualiza el reporte y exporta en el formato que necesites.</p>
        </div>
      </header>

      <div class="layout">

        <!-- PANEL IZQUIERDO: filtros + acciones -->
        <aside class="side-panel">

          <div class="card">
            <h2 class="card-title">Filtros</h2>

            <div class="field">
              <label>Fecha inicio</label>
              <input type="date" [(ngModel)]="startDate" [max]="today"
                     (ngModelChange)="onStartDateChange(); refresh()" />
            </div>

            <div class="field">
              <label>Fecha fin</label>
              <input type="date" [(ngModel)]="endDate"
                     [min]="startDate || undefined" [max]="today"
                     (ngModelChange)="refresh()" />
            </div>

            <div class="field">
              <label>Estado</label>
              <select [(ngModel)]="status" (ngModelChange)="refresh()">
                <option value="">Todos los estados</option>
                <option value="CREATED">Creada</option>
                <option value="APPROVED">Aprobada</option>
                <option value="RECEIVED">Recibida</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>

            <div class="field">
              <label>Proveedor</label>
              <select [(ngModel)]="providerId" (ngModelChange)="refresh()">
                <option value="">Todos los proveedores</option>
                @for (p of providers; track p.id) {
                  <option [value]="p.id">{{ p.businessName }}</option>
                }
              </select>
            </div>
          </div>

          <!-- EXPORTAR -->
          <div class="card">
            <h2 class="card-title">Exportar</h2>

            <button class="btn-primary" (click)="downloadPdf()"
                    [disabled]="isBusy()">
              @if (exportStatus() === 'loading-pdf') {
                <span class="spinner"></span> Generando PDF...
              } @else {
                <span class="btn-icon">📄</span> Descargar PDF
              }
            </button>

            <button class="btn-secondary" (click)="downloadExcel()"
                    [disabled]="isBusy()">
              @if (exportStatus() === 'loading-excel') {
                <span class="spinner"></span> Generando Excel...
              } @else {
                <span class="btn-icon">📊</span> Descargar Excel
              }
            </button>

            <div class="divider"></div>

            <div class="field">
              <label>Enviar por correo</label>
              <input type="email" [(ngModel)]="recipientEmail"
                     placeholder="administrador@negocio.com" />
            </div>

            <button class="btn-email" (click)="sendEmail()"
                    [disabled]="isBusy() || !recipientEmail">
              @if (exportStatus() === 'loading-email') {
                <span class="spinner"></span> Enviando...
              } @else {
                <span class="btn-icon">✉️</span> Enviar reporte
              }
            </button>

            @if (exportStatus() === 'email-sent') {
              <div class="alert-success">✓ Reporte enviado a {{ recipientEmail }}</div>
            }
          </div>

          @if (exportStatus() === 'error') {
            <div class="alert-error">{{ errorMessage() }}</div>
          }

        </aside>

        <!-- PANEL DERECHO: previsualización -->
        <main class="preview-panel">
          <div class="preview-header">
            <span class="preview-label">Previsualización</span>
            @if (exportStatus() === 'loading-preview') {
              <span class="preview-loading">Actualizando...</span>
            }
          </div>

          @if (previewHtml()) {
            <iframe class="preview-frame"
                    [srcdoc]="previewHtml()"
                    sandbox="allow-same-origin">
            </iframe>
          } @else if (exportStatus() !== 'loading-preview') {
            <div class="preview-empty">
              <div class="preview-empty-icon">📋</div>
              <p>Aplica los filtros para ver la previsualización del reporte.</p>
            </div>
          }

          @if (exportStatus() === 'loading-preview') {
            <div class="preview-skeleton">
              <div class="skeleton-title"></div>
              <div class="skeleton-metrics">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
              </div>
              <div class="skeleton-row"></div>
              <div class="skeleton-row short"></div>
              <div class="skeleton-row"></div>
              <div class="skeleton-row short"></div>
              <div class="skeleton-row"></div>
            </div>
          }
        </main>

      </div>
    </div>
  `,
  styles: [`
    .export-page { min-height: 100vh; background: #f9f9f7; padding: 24px; }

    /* Header */
    .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .btn-back { background: none; border: 1px solid #eadfcf; border-radius: 8px;
                padding: 8px 14px; cursor: pointer; color: #6b7280; font-size: 13px;
                transition: background .15s; }
    .btn-back:hover { background: #fff; }
    h1 { font-size: 20px; font-weight: 700; color: #1e1e1e; margin: 0; }
    .subtitle { font-size: 13px; color: #6b7280; margin: 2px 0 0; }

    /* Layout */
    .layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }

    /* Side panel */
    .side-panel { display: flex; flex-direction: column; gap: 16px; }
    .card { background: #fff; border: 1px solid #eadfcf; border-radius: 12px;
            padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .card-title { font-size: 13px; font-weight: 700; color: #1e1e1e; margin: 0; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;
            letter-spacing: .4px; }
    input, select { border: 1px solid #eadfcf; border-radius: 8px; padding: 8px 10px;
                    font-size: 13px; color: #1e1e1e; outline: none; transition: border .15s; }
    input:focus, select:focus { border-color: #ff6b35; }
    .divider { border: none; border-top: 1px solid #f3ece4; margin: 4px 0; }

    /* Botones */
    .btn-primary, .btn-secondary, .btn-email {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      border: none; border-radius: 8px; padding: 10px 14px; font-size: 13px;
      font-weight: 600; cursor: pointer; transition: opacity .15s, transform .1s;
      width: 100%; }
    .btn-primary { background: #ff6b35; color: #fff; }
    .btn-secondary { background: #1d6f42; color: #fff; }
    .btn-email { background: #1d4ed8; color: #fff; }
    .btn-primary:hover:not(:disabled),
    .btn-secondary:hover:not(:disabled),
    .btn-email:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
    button:disabled { opacity: .5; cursor: not-allowed; transform: none; }
    .btn-icon { font-size: 14px; }

    /* Spinner */
    .spinner { display: inline-block; width: 12px; height: 12px;
               border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
               border-radius: 50%; animation: spin .6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Alertas */
    .alert-success { background: #dcfce7; color: #15803d; border-radius: 8px;
                     padding: 8px 12px; font-size: 12px; font-weight: 600; }
    .alert-error { background: #fee2e2; color: #b91c1c; border-radius: 8px;
                   padding: 10px 12px; font-size: 12px; }

    /* Preview */
    .preview-panel { background: #fff; border: 1px solid #eadfcf; border-radius: 12px;
                     overflow: hidden; min-height: 600px; display: flex; flex-direction: column; }
    .preview-header { display: flex; align-items: center; justify-content: space-between;
                      padding: 12px 16px; border-bottom: 1px solid #f3ece4;
                      background: #fafaf8; }
    .preview-label { font-size: 12px; font-weight: 700; color: #6b7280;
                     text-transform: uppercase; letter-spacing: .5px; }
    .preview-loading { font-size: 11px; color: #ff6b35; animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }
    .preview-frame { flex: 1; border: none; width: 100%; min-height: 560px; }
    .preview-empty { flex: 1; display: flex; flex-direction: column;
                     align-items: center; justify-content: center; color: #9ca3af;
                     gap: 12px; padding: 60px; }
    .preview-empty-icon { font-size: 48px; }
    .preview-empty p { font-size: 14px; text-align: center; }

    /* Skeleton */
    .preview-skeleton { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
    .skeleton-title { height: 28px; background: #f3ece4; border-radius: 6px;
                      width: 40%; margin: 0 auto; animation: shimmer 1.2s infinite; }
    .skeleton-metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
    .skeleton-card { height: 64px; background: #f3ece4; border-radius: 8px;
                     animation: shimmer 1.2s infinite; }
    .skeleton-row { height: 36px; background: #f9f5f0; border-radius: 6px;
                    animation: shimmer 1.2s infinite; }
    .skeleton-row.short { height: 28px; width: 70%; }
    @keyframes shimmer {
      0%   { background-color: #f3ece4; }
      50%  { background-color: #fdf4ec; }
      100% { background-color: #f3ece4; }
    }
  `]
})
export class PurchaseExportPageComponent implements OnInit {

  // ── Filtros ────────────────────────────────────────────────────────────────
  startDate    = '';
  endDate      = '';
  status       = '';
  providerId   = '';
  recipientEmail = '';
  providers: ProviderDTO[] = [];
  today = new Date().toISOString().split('T')[0];

  // ── Estado ─────────────────────────────────────────────────────────────────
  exportStatus = signal<ExportStatus>('idle');
  errorMessage = signal('');
  previewHtml = signal<SafeHtml>('');

  isBusy = computed(() =>
    ['loading-preview','loading-pdf','loading-excel','loading-email']
      .includes(this.exportStatus())
  );

  private readonly authService = inject(AuthService);
  private get locationId(): string {
    return this.authService.getLocationId() || ENV.locationId;
  }
  private previewTimer: any = null;

  constructor(
    private http: HttpClient,
    private providerService: ProviderService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.providerService.getActiveProviders().subscribe(data => this.providers = data);
  }

  // ── Auto-refresh previsualización ─────────────────────────────────────────

  refresh(): void {
    clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.loadPreview(), 600);
  }

  private loadPreview(): void {
    this.exportStatus.set('loading-preview');
    this.errorMessage.set('');

    this.http.get(`${this.baseUrl()}/export/preview`, {
      params: this.buildParams(), responseType: 'text'
    }).subscribe({
      next: html => {
        this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.exportStatus.set('idle');
      },
      error: () => {
        this.exportStatus.set('error');
        this.errorMessage.set('No se pudo cargar la previsualización.');
      }
    });
  }

  // ── Descargar PDF ─────────────────────────────────────────────────────────

  downloadPdf(): void {
    this.startDownload('loading-pdf',
      `${this.baseUrl()}/export/pdf`,
      `compras-${this.dateStr()}.pdf`,
      'application/pdf');
  }

  // ── Descargar Excel ───────────────────────────────────────────────────────

  downloadExcel(): void {
    this.startDownload('loading-excel',
      `${this.baseUrl()}/export/excel`,
      `compras-${this.dateStr()}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  private startDownload(status: ExportStatus, url: string, filename: string, mime: string): void {
    this.exportStatus.set(status);
    this.errorMessage.set('');

    this.http.get(url, { params: this.buildParams(), responseType: 'blob' }).subscribe({
      next: blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([blob], { type: mime }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        this.exportStatus.set('idle');
      },
      error: () => {
        this.exportStatus.set('error');
        this.errorMessage.set('No se pudo generar el archivo. Intenta de nuevo.');
      }
    });
  }

  // ── Enviar por correo ─────────────────────────────────────────────────────

  sendEmail(): void {
    if (!this.recipientEmail) return;
    this.exportStatus.set('loading-email');
    this.errorMessage.set('');

    this.http.post(`${this.baseUrl()}/export/email`,
      { recipientEmail: this.recipientEmail },
      { params: this.buildParams() }
    ).subscribe({
      next: () => {
        this.exportStatus.set('email-sent');
        setTimeout(() => this.exportStatus.set('idle'), 4000);
      },
      error: () => {
        this.exportStatus.set('error');
        this.errorMessage.set('No se pudo enviar el correo. Verifica la dirección e intenta de nuevo.');
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  onStartDateChange(): void {
    if (this.endDate && this.startDate && this.endDate < this.startDate) {
      this.endDate = '';
    }
  }

  goBack(): void { this.router.navigate(['/commercial/purchases']); }

  private baseUrl(): string {
    return `${ENV.apiUrl}/locations/${this.locationId}/purchases`;
  }

  private buildParams(): HttpParams {
    let params = new HttpParams();
    if (this.status)     params = params.set('status', this.status);
    if (this.providerId) params = params.set('providerId', this.providerId);
    if (this.startDate)  params = params.set('startDate', this.startDate);
    if (this.endDate)    params = params.set('endDate', this.endDate);
    return params;
  }

  private dateStr(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }
}