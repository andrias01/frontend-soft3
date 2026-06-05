import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  TransferListFilter,
  TransferResponse
} from '../../models/transfer.model';
import { TransferService } from '../../services/transfer.service';
import { TransferReferenceDataService } from '../../services/transfer-reference-data.service';
import { UserProfileService } from '@features/user/services/user-profile.service';
import { LocationResponse } from '@features/inventory/location/models/location.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-transfer-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    <div class="page-shell">
      <div class="hero-card">
        <div>
          <p class="eyebrow">Inventory / Transfer</p>
          <h1>Traslados entre sedes</h1>
          <p>
            Desde aqui origen despacha o cancela, y destino completa o reclama cuando recibe.
          </p>
        </div>
        <a class="btn-primary" routerLink="create">Crear traslado</a>
      </div>

      <div class="filter-bar">
        @for (option of filters; track option.value) {
          <button
            type="button"
            class="filter-chip"
            [class.active]="selectedFilter() === option.value"
            [disabled]="isLoading()"
            (click)="loadTransfers(option.value)">
            {{ option.label }}
          </button>
        }

        <label class="date-filter" [class.has-value]="selectedDate">
          <span>Fecha</span>
          <input
            type="date"
            [(ngModel)]="selectedDate"
            [disabled]="isLoading()"
            aria-label="Consultar traslados por fecha" />
        </label>

        @if (selectedDate) {
          <button
            type="button"
            class="filter-chip clear-chip"
            [disabled]="isLoading()"
            (click)="clearDateFilter()">
            Limpiar fecha
          </button>
        }
      </div>

      @if (bannerMessage()) {
        <div class="alert-success">{{ bannerMessage() }}</div>
      }

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (isLoading()) {
        <div class="loading-card">
          <div class="spinner"></div>
          <p>Cargando traslados...</p>
        </div>
      } @else if (!filteredTransfers().length) {
        <div class="empty-card">
          <h2>No hay traslados para este filtro</h2>
          <p>Crea un traslado nuevo o cambia de vista para revisar otros estados.</p>
        </div>
      } @else {
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Fecha de salida</th>
                <th>Fecha de llegada</th>
                <th>Estado</th>
                <th>Responsable</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (transfer of filteredTransfers(); track transfer.idTraslado) {
                <tr>
                  <td>
                    <div class="primary-cell">{{ locationLabel(transfer.sedeOrigen) }} -> {{ locationLabel(transfer.sedeDestino) }}</div>
                    <div class="secondary-cell">{{ roleLabel(transfer) }}</div>
                  </td>
                  <td>
                    <div class="primary-cell">{{ transfer.fechaEnvio | date:'dd/MM/yyyy HH:mm' }}</div>
                  </td>
                  <td>
                    <div class="primary-cell">{{ transfer.fechaLlegada | date:'dd/MM/yyyy HH:mm' }}</div>
                  </td>
                  <td>
                    <span class="status-pill" [class]="statusClass(transfer.estado)">
                      {{ transfer.estado }}
                    </span>
                  </td>
                  <td>
                    <div class="primary-cell">{{ transfer.responsable }}</div>
                    @if (transfer.observaciones) {
                      <div class="secondary-cell truncate">{{ transfer.observaciones }}</div>
                    }
                  </td>
                  <td>
                    <div class="action-stack">
                      <a class="btn-view" [routerLink]="[transfer.idTraslado]">Ver</a>

                      @if (canSendToTransit(transfer)) {
                        <button
                          class="btn-secondary"
                          [disabled]="processingId() === transfer.idTraslado"
                          (click)="sendToTransit(transfer)">
                          {{ processingId() === transfer.idTraslado ? 'Enviando...' : 'Pasar a transito' }}
                        </button>
                      }

                      @if (canCancel(transfer)) {
                        <button
                          class="btn-danger"
                          [disabled]="processingId() === transfer.idTraslado"
                          (click)="cancelTransfer(transfer)">
                          {{ processingId() === transfer.idTraslado ? 'Cancelando...' : 'Cancelar' }}
                        </button>
                      }

                      @if (canConfirm(transfer)) {
                        <button
                          class="btn-success"
                          [disabled]="processingId() === transfer.idTraslado"
                          (click)="confirmTransfer(transfer)">
                          {{ processingId() === transfer.idTraslado ? 'Completando...' : 'Completar' }}
                        </button>
                      }

                      @if (canClaim(transfer)) {
                        <button
                          class="btn-warning"
                          [disabled]="processingId() === transfer.idTraslado"
                          (click)="toggleClaim(transfer.idTraslado)">
                          {{ openClaimId() === transfer.idTraslado ? 'Cerrar reclamo' : 'Reclamar' }}
                        </button>
                      }
                    </div>

                    @if (openClaimId() === transfer.idTraslado) {
                      <div class="claim-box">
                        <label [for]="'claim-' + transfer.idTraslado">Observaciones del reclamo</label>
                        <textarea
                          [id]="'claim-' + transfer.idTraslado"
                          [(ngModel)]="claimText"
                          rows="3"
                          placeholder="Ej. llego incompleto o con novedad"></textarea>
                        <button
                          class="btn-warning btn-full"
                          [disabled]="processingId() === transfer.idTraslado || !claimText.trim()"
                          (click)="submitClaim(transfer)">
                          {{ processingId() === transfer.idTraslado ? 'Enviando reclamo...' : 'Confirmar reclamo' }}
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; color: #0f172a; }
    .page-shell { display: flex; flex-direction: column; gap: 1.5rem; }
    .hero-card {
      background: linear-gradient(135deg, var(--color-secondary) 0%, #2f2f2f 100%);
      color: white;
      padding: 1.75rem;
      border-radius: 1rem;
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      align-items: flex-end;
    }
    .eyebrow { margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; opacity: 0.7; }
    .hero-card h1 { margin: 0; font-size: 2rem; line-height: 1.05; }
    .hero-card p { max-width: 640px; margin: 0.75rem 0 0; color: rgba(255, 255, 255, 0.8); }
    .filter-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
    .filter-chip {
      border: 1px solid #cbd5e1;
      background: white;
      border-radius: 999px;
      min-height: 44px;
      padding: 0.55rem 1rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .filter-chip.active { background: var(--color-secondary); border-color: var(--color-secondary); color: white; }
    .filter-chip:disabled { opacity: 0.55; cursor: not-allowed; }
    .clear-chip { color: #b91c1c; border-color: #fecaca; }
    .date-filter {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 44px;
      border: 1px solid #cbd5e1;
      background: white;
      border-radius: 999px;
      padding: 0.35rem 0.65rem 0.35rem 1rem;
      color: #334155;
      font-weight: 700;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .date-filter:hover,
    .date-filter:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(255,107,53,0.14);
    }
    .date-filter.has-value { border-color: #fdba74; background: #fff7ed; }
    .date-filter span {
      color: #64748b;
      font-size: 0.78rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .date-filter input {
      border: none;
      color: #0f172a;
      font: inherit;
      font-weight: 700;
      outline: none;
      background: transparent;
      min-width: 136px;
      height: 32px;
      padding: 0;
      color-scheme: light;
    }
    .date-filter input::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.75;
    }
    .date-filter:has(input:disabled) { opacity: 0.55; }
    .btn-primary, .btn-secondary, .btn-danger, .btn-success, .btn-warning, .btn-view {
      border: none;
      border-radius: 0.7rem;
      padding: 0.65rem 1rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
    }
    .btn-primary { background: var(--color-primary); color: white; box-shadow: 0 2px 8px rgba(234, 88, 12, 0.25); }
    .btn-view { background: #f8fafc; color: #334155; border: 1px solid #cbd5e1; }
    .btn-secondary { background: #fff7ed; color: var(--color-primary); border: 1px solid #fed7aa; }
    .btn-danger { background: #fee2e2; color: #b91c1c; }
    .btn-success { background: rgba(46, 196, 182, 0.16); color: #0f766e; }
    .btn-warning { background: #fff7ed; color: #c2410c; }
    .btn-full { width: 100%; }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .alert-success, .alert-error, .empty-card, .loading-card, .table-card {
      border-radius: 1rem;
      padding: 1.25rem;
      background: white;
      border: 1px solid #e2e8f0;
    }
    .alert-success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .alert-error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
    .loading-card, .empty-card { text-align: center; color: #475569; padding: 3rem 1.5rem; }
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
    .table-card { overflow: auto; padding: 0; }
    .data-table { width: 100%; border-collapse: collapse; min-width: 1040px; }
    .data-table th {
      background: linear-gradient(to right, #fff7ed, #fff);
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 0.75rem;
      padding: 1rem;
      text-align: left;
    }
    .data-table td { padding: 1rem; border-top: 1px solid #f1f5f9; vertical-align: top; }
    .primary-cell { font-weight: 600; color: #0f172a; }
    .secondary-cell { color: #64748b; font-size: 0.8125rem; margin-top: 0.25rem; }
    .truncate { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mono { font-family: monospace; color: #475569; }
    .status-pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.35rem 0.7rem;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .status-en-proceso { background: #fff7ed; color: #c2410c; }
    .status-en-transito { background: rgba(46, 196, 182, 0.14); color: #0f766e; }
    .status-completado { background: #dcfce7; color: #166534; }
    .status-cancelado { background: #fee2e2; color: #b91c1c; }
    .status-reclamado { background: #fff7ed; color: #c2410c; }
    .action-stack { display: flex; flex-direction: column; gap: 0.5rem; min-width: 150px; }
    .claim-box {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: var(--color-background);
      border: 1px solid #fed7aa;
      border-radius: 0.75rem;
      padding: 0.75rem;
    }
    .claim-box label { font-size: 0.8125rem; font-weight: 700; color: #9a3412; }
    .claim-box textarea {
      border: 1px solid #fdba74;
      border-radius: 0.65rem;
      padding: 0.75rem;
      resize: vertical;
      font: inherit;
    }
    @media (max-width: 900px) {
      .hero-card { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class TransferListPageComponent implements OnInit {
  private readonly transferService = inject(TransferService);
  private readonly userProfileService = inject(UserProfileService);
  private readonly referenceDataService = inject(TransferReferenceDataService);

  protected readonly locationId = signal<string | null>(null);
  protected readonly loadingContext = signal(true);
  protected readonly filters: Array<{ label: string; value: TransferListFilter }> = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Entrantes', value: 'ENTRANTES' },
    { label: 'Salientes', value: 'SALIENTES' },
    { label: 'En transito', value: 'EN_TRANSITO' },
    { label: 'Completados', value: 'COMPLETADOS' },
    { label: 'Cancelados', value: 'CANCELADOS' },
    { label: 'Reclamados', value: 'RECLAMADOS' }
  ];

  protected readonly transfers = signal<TransferResponse[]>([]);
  protected readonly locations = signal<LocationResponse[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly bannerMessage = signal<string | null>(null);
  protected readonly selectedFilter = signal<TransferListFilter>('TODOS');
  protected readonly processingId = signal<number | null>(null);
  protected readonly openClaimId = signal<number | null>(null);
  protected selectedDate = '';
  protected claimText = '';

  async ngOnInit(): Promise<void> {
    await this.loadCurrentLocation();
    await this.loadLocations();
    if (this.locationId()) {
      this.loadTransfers('TODOS');
    }
  }

  protected loadTransfers(filter: TransferListFilter): void {
    const currentLocationId = this.locationId() ?? '';
    this.selectedFilter.set(filter);
    this.isLoading.set(true);
    this.error.set(null);
    this.bannerMessage.set(null);
    this.openClaimId.set(null);
    this.claimText = '';

    let request$: Observable<TransferResponse[]>;

    switch (filter) {
      case 'ENTRANTES':
        request$ = this.transferService.getIncoming(currentLocationId);
        break;
      case 'SALIENTES':
        request$ = this.transferService.getAll();
        break;
      case 'EN_TRANSITO':
        request$ = this.transferService.getInTransit();
        break;
      case 'COMPLETADOS':
        request$ = this.transferService.getCompleted();
        break;
      case 'CANCELADOS':
        request$ = this.transferService.getCancelled();
        break;
      case 'RECLAMADOS':
        request$ = this.transferService.getClaimed();
        break;
      default:
        request$ = this.transferService.getAll();
        break;
    }

    request$.subscribe({
      next: transfers => {
        this.transfers.set(this.applyLocationFilter(transfers, filter, currentLocationId));
        this.isLoading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'No fue posible cargar los traslados.');
        this.transfers.set([]);
        this.isLoading.set(false);
      }
    });
  }

  protected clearDateFilter(): void {
    this.selectedDate = '';
  }

  protected filteredTransfers(): TransferResponse[] {
    const selectedDate = this.selectedDate;
    if (!selectedDate) {
      return this.transfers();
    }

    return this.transfers().filter(transfer =>
      this.isSameDate(transfer.fechaEnvio, selectedDate)
      || this.isSameDate(transfer.fechaLlegada, selectedDate)
    );
  }

  private applyLocationFilter(
    transfers: TransferResponse[],
    filter: TransferListFilter,
    currentLocationId: string
  ): TransferResponse[] {
    if (filter === 'SALIENTES') {
      return transfers.filter(transfer => transfer.sedeOrigen === currentLocationId);
    }

    return transfers;
  }

  protected canSendToTransit(transfer: TransferResponse): boolean {
    const currentLocationId = this.locationId();
    return !!currentLocationId && transfer.sedeOrigen === currentLocationId && transfer.estado === 'EN_PROCESO';
  }

  protected canCancel(transfer: TransferResponse): boolean {
    const currentLocationId = this.locationId();
    return !!currentLocationId && transfer.sedeOrigen === currentLocationId && transfer.estado === 'EN_PROCESO';
  }

  protected canConfirm(transfer: TransferResponse): boolean {
    const currentLocationId = this.locationId();
    return !!currentLocationId && transfer.sedeDestino === currentLocationId && transfer.estado === 'EN_TRANSITO';
  }

  protected canClaim(transfer: TransferResponse): boolean {
    const currentLocationId = this.locationId();
    return !!currentLocationId && transfer.sedeDestino === currentLocationId && transfer.estado === 'EN_TRANSITO';
  }

  protected sendToTransit(transfer: TransferResponse): void {
    const currentLocationId = this.locationId();
    if (!currentLocationId) return;

    this.runAction(
      transfer.idTraslado,
      this.transferService.sendToTransit(transfer.idTraslado, currentLocationId),
      `Traslado #${transfer.idTraslado} enviado a transito.`
    );
  }

  protected cancelTransfer(transfer: TransferResponse): void {
    const currentLocationId = this.locationId();
    if (!currentLocationId) return;

    this.runAction(
      transfer.idTraslado,
      this.transferService.cancel(transfer.idTraslado, currentLocationId),
      `Traslado #${transfer.idTraslado} cancelado correctamente.`
    );
  }

  protected confirmTransfer(transfer: TransferResponse): void {
    const currentLocationId = this.locationId();
    if (!currentLocationId) return;

    this.runAction(
      transfer.idTraslado,
      this.transferService.confirm(transfer.idTraslado, currentLocationId),
      `Traslado #${transfer.idTraslado} completado y recibido.`
    );
  }

  protected toggleClaim(transferId: number): void {
    if (this.openClaimId() === transferId) {
      this.openClaimId.set(null);
      this.claimText = '';
      return;
    }

    this.openClaimId.set(transferId);
    this.claimText = '';
  }

  protected submitClaim(transfer: TransferResponse): void {
    const observaciones = this.claimText.trim();
    const currentLocationId = this.locationId();
    if (!observaciones) {
      return;
    }
    if (!currentLocationId) {
      return;
    }

    this.runAction(
      transfer.idTraslado,
      this.transferService.claim(transfer.idTraslado, currentLocationId, { observaciones }),
      `Reclamo registrado para el traslado #${transfer.idTraslado}.`
    );
  }

  protected locationLabel(locationId: string): string {
    const location = this.locations().find(item => item.id === locationId);
    return location ? `${location.name} - ${location.city}` : locationId.slice(0, 8);
  }

  protected roleLabel(transfer: TransferResponse): string {
    const currentLocationId = this.locationId();
    if (currentLocationId && transfer.sedeOrigen === currentLocationId) {
      return 'Tu sede es origen';
    }
    if (currentLocationId && transfer.sedeDestino === currentLocationId) {
      return 'Tu sede es destino';
    }
    return 'Traslado de otra sede';
  }

  protected statusClass(status: TransferResponse['estado']): string {
    return `status-${status.toLowerCase().replace('_', '-')}`;
  }

  private isSameDate(value: string | null | undefined, selectedDate: string): boolean {
    if (!value) {
      return false;
    }

    if (value.slice(0, 10) === selectedDate) {
      return true;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date.toISOString().slice(0, 10) === selectedDate;
  }

  private runAction(
    transferId: number,
    request$: Observable<TransferResponse>,
    successMessage: string
  ): void {
    this.processingId.set(transferId);
    this.error.set(null);
    this.bannerMessage.set(null);

    request$.subscribe({
      next: () => {
        this.processingId.set(null);
        this.openClaimId.set(null);
        this.claimText = '';
        this.bannerMessage.set(successMessage);
        this.loadTransfers(this.selectedFilter());
      },
      error: err => {
        this.processingId.set(null);
        this.error.set(err?.error?.message ?? 'No fue posible ejecutar la accion.');
      }
    });
  }

  private async loadCurrentLocation(): Promise<void> {
    this.loadingContext.set(true);

    try {
      const profile = await this.userProfileService.loadProfileData();
      this.locationId.set(profile.editable.locationId || null);
    } catch {
      this.locationId.set(null);
      this.error.set('No se pudo cargar la sede del usuario autenticado.');
    } finally {
      this.loadingContext.set(false);
    }
  }

  private async loadLocations(): Promise<void> {
    try {
      this.locations.set(await this.referenceDataService.loadSelectableLocations());
    } catch {
      this.locations.set([]);
    }
  }
}
