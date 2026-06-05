import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmDialogComponent } from '../dialogs/confirm-dialog.component';
import { ReservationFormDialogComponent } from '../dialogs/reservation-form-dialog.component';
import { EmptyStateComponent } from '../components/empty-state.component';
import { LoadingSkeletonComponent } from '../components/loading-skeleton.component';
import { StatusBadgeComponent } from '../components/status-badge.component';
import { TableReservationDTO } from '../models/table.models';
import { DateTimePipe } from '../pipes/date-time.pipe';
import { TableNotificationService } from '../services/table-notification.service';
import { TablesStore } from '../store/tables.store';

@Component({
  selector: 'eatup-tables-reservations',
  standalone: true,
  imports: [FormsModule, LoadingSkeletonComponent, EmptyStateComponent, StatusBadgeComponent, ConfirmDialogComponent, ReservationFormDialogComponent, DateTimePipe],
  template: `
    <header class="page-header">
      <div>
        <span>Agenda de reservas</span>
        <h1>Reservas</h1>
        <p>Busca por documento, edita reservas activas, cancela o sienta invitados.</p>
      </div>
    </header>

    <section class="filters compact">
      <label class="search">
        <span>Documento</span>
        <input type="search" [(ngModel)]="documentSearch" placeholder="Buscar documento" />
      </label>
      <button type="button" (click)="search()">Buscar</button>
      <button type="button" class="ghost" (click)="resetSearch()">Ver activas</button>
    </section>

    @if (store.loading() && reservations().length === 0) {
      <eatup-loading-skeleton [rows]="5" />
    } @else if (reservations().length === 0) {
      <eatup-empty-state title="Sin reservas" description="No hay reservas que coincidan con la búsqueda." />
    } @else {
      <section class="reservation-grid">
        @for (reservation of reservations(); track reservation.id) {
          <article class="reservation-card">
            <div class="reservation-top">
              <div>
                <span>Mesa {{ getTableNumber(reservation.tableId) }}</span>
                <h2>{{ reservation.guestName }}</h2>
              </div>
              <eatup-status-badge [status]="reservation.status" />
            </div>

            <dl>
              <div><dt>Documento</dt><dd>{{ reservation.guestDocumentNumber }}</dd></div>
              <div><dt>Invitados</dt><dd>{{ reservation.guestCount }}</dd></div>
              <div><dt>Reserva</dt><dd>{{ reservation.reservationDateTime | eatupDateTime }}</dd></div>
            </dl>

            <div class="reservation-timeline">
              <div class="timeline-row">
                <span class="timeline-label lock">🔒 Bloqueo</span>
                <span class="timeline-value">{{ reservation.reservationLockStartsAt | eatupDateTime }}</span>
              </div>
              <div class="timeline-row">
                <span class="timeline-label grace">⏱ Tolerancia</span>
                <span class="timeline-value">{{ reservation.reservationGraceEndsAt | eatupDateTime }}</span>
              </div>
              @if (isExpiringSoon(reservation)) {
                <div class="timeline-warning">⚠️ La tolerancia vence pronto</div>
              }
              @if (isLocked(reservation)) {
                <div class="timeline-info">🔒 Mesa bloqueada para esta reserva</div>
              }
            </div>

            <footer>
              <button type="button" (click)="edit(reservation)">Editar</button>
              <button type="button" (click)="confirmSeat(reservation)">Sentar</button>
              <button type="button" class="danger-link" (click)="confirmCancel(reservation)">Cancelar</button>
            </footer>
          </article>
        }
      </section>
    }

    <eatup-reservation-form-dialog
      [open]="dialogOpen()"
      [reservation]="selectedReservation()"
      [tableId]="selectedReservation()?.tableId ?? ''"
      (save)="save($event)"
      (cancel)="dialogOpen.set(false)"
    />
    <eatup-confirm-dialog
      [open]="confirmOpen()"
      [title]="confirmTitle()"
      [message]="confirmMessage()"
      [confirmText]="confirmText()"
      (confirm)="runConfirm()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
  styleUrl: './tables-pages.css',
})
export class TablesReservationsPage implements OnInit {
  readonly store = inject(TablesStore);
  private readonly notifications = inject(TableNotificationService);

  readonly reservations = signal<TableReservationDTO[]>([]);
  readonly selectedReservation = signal<TableReservationDTO | null>(null);
  readonly dialogOpen = signal(false);
  readonly confirmOpen = signal(false);
  readonly confirmTitle = signal('Confirmar acción');
  readonly confirmMessage = signal('');
  readonly confirmText = signal('Confirmar');
  readonly confirmAction = signal<(() => void) | null>(null);
  documentSearch = '';

  ngOnInit(): void {
    this.store.loadReservations();
    this.store.loadTables();
    this.reservations.set(this.store.reservations());
    window.setTimeout(() => this.reservations.set(this.store.reservations()), 420);
  }

  getTableNumber(tableId: string | undefined): string {
    if (!tableId) return 'Sin asignar';
    const table = this.store.tables().find(t => t.id === tableId);
    return table ? String(table.tableNumber) : tableId;
  }

  isLocked(reservation: TableReservationDTO): boolean {
    if (!reservation.reservationLockStartsAt) return false;
    const now = new Date();
    const lockStart = new Date(reservation.reservationLockStartsAt);
    const graceEnd = reservation.reservationGraceEndsAt ? new Date(reservation.reservationGraceEndsAt) : null;
    return now >= lockStart && (!graceEnd || now <= graceEnd);
  }

  isExpiringSoon(reservation: TableReservationDTO): boolean {
    if (!reservation.reservationGraceEndsAt) return false;
    const now = new Date();
    const graceEnd = new Date(reservation.reservationGraceEndsAt);
    const diffMinutes = (graceEnd.getTime() - now.getTime()) / 60000;
    return diffMinutes > 0 && diffMinutes <= 10;
  }

  search(): void {
    const doc = this.documentSearch.trim().toLowerCase();
    if (!doc) {
      this.resetSearch();
      return;
    }
    const filtered = this.store.reservations().filter(r =>
      r.guestDocumentNumber?.toLowerCase().includes(doc)
    );
    this.reservations.set(filtered);
  }

  resetSearch(): void {
    this.store.loadReservations();
    window.setTimeout(() => this.reservations.set(this.store.reservations()), 420);
  }

  edit(reservation: TableReservationDTO): void {
    this.selectedReservation.set(reservation);
    this.dialogOpen.set(true);
  }

  save(reservation: TableReservationDTO): void {
    this.dialogOpen.set(false);
    const tableId = reservation.tableId || this.selectedReservation()?.tableId;
    if (!tableId) {
      this.notifications.error('Selecciona una mesa para la reserva');
      return;
    }
    this.store.saveReservation(tableId, reservation);
    this.resetSearch();
  }

  confirmSeat(reservation: TableReservationDTO): void {
    this.confirmTitle.set('Sentar reserva');
    this.confirmMessage.set(`¿Confirmas que el cliente ${reservation.guestName} llegó y será sentado en la mesa ${this.getTableNumber(reservation.tableId)}?`);
    this.confirmText.set('Sentar');
    this.confirmAction.set(() => this.store.seatReservation(reservation));
    this.confirmOpen.set(true);
  }

  confirmCancel(reservation: TableReservationDTO): void {
    this.confirmTitle.set('Cancelar reserva');
    this.confirmMessage.set(`La reserva de ${reservation.guestName} será cancelada y dejará de aparecer como activa.`);
    this.confirmText.set('Cancelar reserva');
    this.confirmAction.set(() => {
      this.store.cancelReservation(reservation);
      this.resetSearch();
    });
    this.confirmOpen.set(true);
  }

  runConfirm(): void {
    this.confirmOpen.set(false);
    this.confirmAction()?.();
  }
}