import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TransferResponse } from '../../models/transfer.model';
import { TransferService } from '../../services/transfer.service';
import { TransferReferenceDataService } from '../../services/transfer-reference-data.service';
import { LocationResponse } from '@features/inventory/location/models/location.model';

@Component({
  selector: 'app-transfer-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="page-shell">
      <div class="detail-header">
        <div>
          <a class="back-link" routerLink="..">Volver a traslados</a>
          <p class="eyebrow">Inventory / Transfer</p>
          <h1>Traslado #{{ transfer()?.idTraslado || transferId() }}</h1>
        </div>

        @if (transfer()) {
          <span class="status-pill" [class]="statusClass(transfer()!.estado)">
            {{ transfer()!.estado }}
          </span>
        }
      </div>

      @if (isLoading()) {
        <div class="state-card">
          <div class="spinner"></div>
          <p>Cargando traslado...</p>
        </div>
      } @else if (error()) {
        <div class="state-card error">
          <h2>No se pudo cargar el traslado</h2>
          <p>{{ error() }}</p>
        </div>
      } @else if (transfer()) {
        <section class="summary-band">
          <div>
            <span class="label">Producto</span>
            <strong>{{ transfer()!.producto }}</strong>
            <small>Cantidad: {{ transfer()!.cantidad }}</small>
          </div>
          <div>
            <span class="label">Ruta</span>
            <strong>{{ locationLabel(transfer()!.sedeOrigen) }} -> {{ locationLabel(transfer()!.sedeDestino) }}</strong>
            <small>Origen a destino</small>
          </div>
          <div>
            <span class="label">Responsable</span>
            <strong>{{ transfer()!.responsable }}</strong>
            <small>Asignado al traslado</small>
          </div>
        </section>

        <section class="detail-grid">
          <div class="detail-panel">
            <h2>Fechas</h2>
            <div class="info-row">
              <span>Fecha de envio</span>
              <strong>{{ transfer()!.fechaEnvio | date:'dd/MM/yyyy HH:mm' }}</strong>
            </div>
            <div class="info-row">
              <span>Fecha de llegada</span>
              <strong>{{ transfer()!.fechaLlegada | date:'dd/MM/yyyy HH:mm' }}</strong>
            </div>
            <div class="info-row">
              <span>Creado</span>
              <strong>{{ transfer()!.createdAt | date:'dd/MM/yyyy HH:mm' }}</strong>
            </div>
            <div class="info-row">
              <span>Actualizado</span>
              <strong>{{ transfer()!.updatedAt | date:'dd/MM/yyyy HH:mm' }}</strong>
            </div>
          </div>

          <div class="detail-panel">
            <h2>Sedes</h2>
            <div class="info-row">
              <span>Sede origen</span>
              <strong>{{ locationLabel(transfer()!.sedeOrigen) }}</strong>
            </div>
            <div class="info-row">
              <span>Sede destino</span>
              <strong>{{ locationLabel(transfer()!.sedeDestino) }}</strong>
            </div>
            <div class="info-row">
              <span>Stock reportado</span>
              <strong>{{ transfer()!.stock ?? 'No disponible' }}</strong>
            </div>
          </div>
        </section>

        <section class="notes-panel">
          <h2>Observaciones</h2>
          <p>{{ transfer()!.observaciones || 'Sin observaciones registradas.' }}</p>
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; color: #0f172a; }
    .page-shell { display: flex; flex-direction: column; gap: 1.5rem; }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: white;
      padding: 1.5rem;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 0.75rem;
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 700;
    }
    .eyebrow {
      margin: 0 0 0.4rem;
      color: #94a3b8;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1, h2 { margin: 0; color: var(--color-secondary); }
    h1 { font-size: 2rem; }
    h2 { font-size: 1rem; }
    .status-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 800;
    }
    .status-en-proceso { background: #fff7ed; color: #c2410c; }
    .status-en-transito { background: rgba(46, 196, 182, 0.14); color: #0f766e; }
    .status-completado { background: #dcfce7; color: #166534; }
    .status-cancelado { background: #fee2e2; color: #b91c1c; }
    .status-reclamado { background: #fff7ed; color: #c2410c; }
    .state-card, .summary-band, .detail-panel, .notes-panel {
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      background: white;
      padding: 1.25rem;
    }
    .state-card { text-align: center; color: #475569; padding: 3rem 1.5rem; }
    .state-card.error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
    .spinner {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      margin: 0 auto 1rem;
      border: 3px solid #ffe2d6;
      border-top-color: var(--color-primary);
      animation: spin 0.75s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .summary-band {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
      background: linear-gradient(135deg, #fff7ed 0%, #fff 100%);
    }
    .summary-band div { display: flex; flex-direction: column; gap: 0.35rem; }
    .label {
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    strong { color: #0f172a; }
    small { color: #64748b; }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }
    .detail-panel { display: flex; flex-direction: column; gap: 1rem; }
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      border-top: 1px solid #f1f5f9;
      padding-top: 0.85rem;
    }
    .info-row span { color: #64748b; }
    .mono { font-family: monospace; word-break: break-all; text-align: right; }
    .notes-panel { display: flex; flex-direction: column; gap: 0.75rem; }
    .notes-panel p { margin: 0; color: #475569; line-height: 1.6; }
    @media (max-width: 900px) {
      .detail-header { align-items: flex-start; flex-direction: column; }
      .summary-band, .detail-grid { grid-template-columns: 1fr; }
      .info-row { flex-direction: column; }
      .mono { text-align: left; }
    }
  `]
})
export class TransferDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly transferService = inject(TransferService);
  private readonly referenceDataService = inject(TransferReferenceDataService);

  protected readonly transfer = signal<TransferResponse | null>(null);
  protected readonly locations = signal<LocationResponse[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly transferId = signal('');

  ngOnInit(): void {
    void this.loadLocations();

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.transferId.set(String(this.route.snapshot.paramMap.get('id') ?? ''));

    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('El identificador del traslado no es válido.');
      this.isLoading.set(false);
      return;
    }

    this.transferService.findById(id).subscribe({
      next: transfer => {
        this.transfer.set(transfer);
        this.isLoading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'No fue posible consultar el traslado.');
        this.isLoading.set(false);
      }
    });
  }

  protected locationLabel(locationId: string): string {
    const location = this.locations().find(item => item.id === locationId);
    return location ? `${location.name} - ${location.city}` : locationId.slice(0, 8);
  }

  protected statusClass(status: TransferResponse['estado']): string {
    return `status-${status.toLowerCase().replace('_', '-')}`;
  }

  private async loadLocations(): Promise<void> {
    try {
      this.locations.set(await this.referenceDataService.loadSelectableLocations());
    } catch {
      this.locations.set([]);
    }
  }
}
