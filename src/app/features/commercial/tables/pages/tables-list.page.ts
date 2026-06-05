import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ConfirmDialogComponent } from '../dialogs/confirm-dialog.component';
import { ReservationFormDialogComponent } from '../dialogs/reservation-form-dialog.component';
import { SessionDialogComponent } from '../dialogs/session-dialog.component';
import { TableFormDialogComponent } from '../dialogs/table-form-dialog.component';
import { EmptyStateComponent } from '../components/empty-state.component';
import { LoadingSkeletonComponent } from '../components/loading-skeleton.component';
import { StatusBadgeComponent } from '../components/status-badge.component';
import { TableFiltersComponent } from '../components/table-filters.component';
import { TableStatus } from '../models/table.enums';
import { TableDTO, TableReservationDTO } from '../models/table.models';
import { DateTimePipe } from '../pipes/date-time.pipe';
import { TablesStore } from '../store/tables.store';

@Component({
  selector: 'eatup-tables-list',
  standalone: true,
  imports: [
    TableFiltersComponent,
    StatusBadgeComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    TableFormDialogComponent,
    SessionDialogComponent,
    ReservationFormDialogComponent,
    ConfirmDialogComponent,
    DateTimePipe,
  ],
  template: `
    <header class="page-header">
      <div>
        <span>Gestión operativa</span>
        <h1>Mesas</h1>
        <p>Administra disponibilidad, atributos, sesiones y reservas por mesa.</p>
      </div>
      <button type="button" (click)="openCreate()">Nueva mesa</button>
    </header>

    <eatup-table-filters [filters]="store.filters()" (filtersChange)="applyFilters($event)" (reset)="store.resetFilters()" />

    @if (store.loading() && store.tables().length === 0) {
      <eatup-loading-skeleton [rows]="6" />
    } @else if (rows().length === 0) {
      <eatup-empty-state title="No hay mesas" description="Crea una mesa o ajusta los filtros para ver resultados." />
    } @else {
      <section class="table-card">
        <table>
          <thead>
            <tr>
              <th>Mesa</th>
              <th>Ubicación</th>
              <th>VIP</th>
              <th>Vista</th>
              <th>Estado</th>
              <th>Reservada</th>
              <th>Sesión</th>
              <th>Próxima reserva</th>
              <th class="right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (table of rows(); track table.id) {
              <tr>
                <td><strong>#{{ table.tableNumber }}</strong></td>
                <td>{{ table.location }}</td>
                <td>{{ table.isVip ? 'Sí' : 'No' }}</td>
                <td>{{ table.hasView ? 'Sí' : 'No' }}</td>
                <td>
                  <eatup-status-badge
                    [status]="table.displayStatus ?? table.status"
                  />
                </td>
                <td>{{ table.reserved ? 'Sí' : 'No' }}</td>
                <td>{{ table.activeSession ? table.activeSession.guestCount + ' invitados' : 'Sin sesión' }}</td>
                <td>{{ table.nextReservationAt | eatupDateTime }}</td>
                <td class="actions">
                  <button type="button" (click)="openEdit(table)">Editar</button>
                  @if (table.status === tableStatus.AVAILABLE) {
                    <button type="button" (click)="openSession(table)">Abrir</button>
                  }
                  @if (table.activeSession) {
                    <button type="button" (click)="confirmClose(table)">Cerrar</button>
                  }
                  <button type="button" (click)="openReservation(table)">Reservar</button>
                  <button type="button" class="danger-link" (click)="confirmDeactivate(table)">Inactivar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }

    <eatup-table-form-dialog [open]="tableDialogOpen()" [table]="selectedTable()" (save)="saveTable($event)" (cancel)="tableDialogOpen.set(false)" />
    <eatup-session-dialog [open]="sessionDialogOpen()" (save)="saveSession($event)" (cancel)="sessionDialogOpen.set(false)" />
    <eatup-reservation-form-dialog
      [open]="reservationDialogOpen()"
      [tableId]="selectedTable()?.id ?? ''"
      (save)="saveReservation($event)"
      (cancel)="reservationDialogOpen.set(false)"
    />
    <eatup-confirm-dialog
      [open]="confirmOpen()"
      [title]="confirmTitle()"
      [message]="confirmMessage()"
      confirmText="Confirmar"
      (confirm)="runConfirm()"
      (cancel)="confirmOpen.set(false)"
    />
  `,
  styleUrl: './tables-pages.css',
})
export class TablesListPage implements OnInit {
  readonly store = inject(TablesStore);
  readonly tableStatus = TableStatus;
  readonly selectedTable = signal<TableDTO | null>(null);
  readonly tableDialogOpen = signal(false);
  readonly sessionDialogOpen = signal(false);
  readonly reservationDialogOpen = signal(false);
  readonly confirmOpen = signal(false);
  readonly confirmTitle = signal('Confirmar acción');
  readonly confirmMessage = signal('');
  readonly confirmAction = signal<(() => void) | null>(null);
  readonly rows = computed(() => this.store.filteredTables());

  ngOnInit(): void {
    this.store.loadTables();
  }

  applyFilters(filters: Partial<ReturnType<TablesStore['filters']>>): void {
    this.store.setFilters(filters);
  }

  openCreate(): void {
    this.selectedTable.set(null);
    this.tableDialogOpen.set(true);
  }

  openEdit(table: TableDTO): void {
    this.selectedTable.set(table);
    this.tableDialogOpen.set(true);
  }

  openSession(table: TableDTO): void {
    this.selectedTable.set(table);
    this.sessionDialogOpen.set(true);
  }

  openReservation(table: TableDTO): void {
    this.selectedTable.set(table);
    this.reservationDialogOpen.set(true);
  }

  saveTable(table: TableDTO): void {
    this.tableDialogOpen.set(false);
    this.store.saveTable(table);
  }

  saveSession(payload: { guestCount: number; observations?: string }): void {
    const table = this.selectedTable();
    this.sessionDialogOpen.set(false);
    if (table) {
      this.store.openSession(table, payload.guestCount, payload.observations);
    }
  }

  saveReservation(reservation: TableReservationDTO): void {
    const table = this.selectedTable();
    this.reservationDialogOpen.set(false);
    if (table?.id) {
      this.store.saveReservation(table.id, reservation);
    }
  }

  confirmDeactivate(table: TableDTO): void {
    this.selectedTable.set(table);
    this.confirmTitle.set('Inactivar mesa');
    this.confirmMessage.set(`La mesa #${table.tableNumber} quedará fuera de operación.`);
    this.confirmAction.set(() => this.store.deactivateTable(table));
    this.confirmOpen.set(true);
  }

  confirmClose(table: TableDTO): void {
    this.selectedTable.set(table);
    this.confirmTitle.set('Cerrar sesión');
    this.confirmMessage.set(`Se cerrará la sesión activa de la mesa #${table.tableNumber}.`);
    this.confirmAction.set(() => this.store.closeSession(table));
    this.confirmOpen.set(true);
  }

  runConfirm(): void {
    this.confirmOpen.set(false);
    this.confirmAction()?.();
  }
}
