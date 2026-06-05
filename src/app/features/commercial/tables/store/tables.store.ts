import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { TableStatus } from '../models/table.enums';
import { TableDTO, TableFilters, TableReservationDTO, TableSessionDTO, TableSummaryDTO } from '../models/table.models';
import { TableNotificationService } from '../services/table-notification.service';
import { TableService } from '../services/table.service';
import { DEFAULT_TABLE_VENUE_ID } from '../utils/table.constants';
import { AuthService } from '@features/user/services/auth.service';

const DEFAULT_FILTERS: TableFilters = {
  search: '',
  venueId: DEFAULT_TABLE_VENUE_ID,
  status: '',
  reserved: null,
  canOpenNow: null,
};

@Injectable({ providedIn: 'root' })
export class TablesStore {
  private readonly tableService = inject(TableService);
  private readonly notifications = inject(TableNotificationService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly tables = signal<TableDTO[]>([]);
  readonly sessions = signal<TableSessionDTO[]>([]);
  readonly reservations = signal<TableReservationDTO[]>([]);
  readonly summary = signal<TableSummaryDTO | null>(null);
  readonly filters = signal<TableFilters>({ ...DEFAULT_FILTERS, venueId: this.currentVenueId() });

  readonly filteredTables = computed(() => {
    const filters = this.filters();
    const search = filters.search.trim().toLowerCase();

    return this.tables().filter((table) => {
      const searchable = `${table.tableNumber} ${table.location} ${table.status ?? ''}`.toLowerCase();
      const searchMatches = search ? searchable.includes(search) : true;
      const statusMatches = filters.status ? table.status === filters.status : true;
      const reservedMatches = filters.reserved === null ? true : table.reserved === filters.reserved;
      const openNowMatches = filters.canOpenNow === null ? true : table.canOpenNow === filters.canOpenNow;
      const venueMatches = filters.venueId ? table.venueId === filters.venueId : true;
      return searchMatches && statusMatches && reservedMatches && openNowMatches && venueMatches;
    });
  });

  readonly availableTables = computed(() => this.tables().filter((table) => table.status === TableStatus.AVAILABLE));
  readonly activeSessions = computed(() => this.sessions().filter((session) => !session.closedAt));
  readonly activeReservations = computed(() => this.reservations());

  loadDashboard(venueId = this.currentVenueId()): void {
    this.loading.set(true);
    const summaryRequest = venueId ? this.tableService.getSummaryByVenue(venueId) : this.tableService.getSummary();

    summaryRequest
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
          this.patchSummaryActivityCounts();
        },
        error: () => this.notifications.error('No se pudo cargar el resumen de mesas'),
      });

    this.loadTables();
    this.loadSessions();
    this.loadReservations();
  }

  loadTables(): void {
    this.loading.set(true);
    const filters = this.filters();

    this.tableService
      .getTables({
        venueId: filters.venueId || undefined,
        status: filters.status || undefined,
        reserved: filters.reserved ?? undefined,
        canOpenNow: filters.canOpenNow ?? undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (tables) => this.tables.set(tables),
        error: () => this.notifications.error('No se pudo cargar el listado de mesas'),
      });
  }

  loadSessions(): void {
    this.tableService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.patchSummaryActivityCounts();
      },
      error: () => this.notifications.error('No se pudo cargar la lista de sesiones'),
    });
  }

  loadReservations(): void {
    this.tableService.getActiveReservations().subscribe({
      next: (reservations) => {
        this.reservations.set(reservations);
        this.patchSummaryActivityCounts();
      },
      error: () => this.notifications.error('No se pudieron cargar las reservas activas'),
    });
  }

  setFilters(filters: Partial<TableFilters>): void {
    this.filters.update((current) => ({ ...current, ...filters }));
  }

  resetFilters(): void {
    this.filters.set({ ...DEFAULT_FILTERS, venueId: this.currentVenueId() });
    this.loadTables();
  }

  saveTable(table: TableDTO): void {
    this.saving.set(true);
    const operation = table.id ? this.tableService.updateTable(table.id, table) : this.tableService.createTable(table);

    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notifications.success(table.id ? 'Mesa actualizada' : 'Mesa creada');
        this.loadTables();
        this.loadDashboard(table.venueId);
      },
      error: (err) => this.notifications.error(this.getErrorMessage(err, 'No se pudo guardar la mesa')),
    });
  }

  deactivateTable(table: TableDTO): void {
    this.saving.set(true);
    this.tableService.deleteTable(table.id!).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notifications.success('Mesa inactivada');
        this.loadTables();
        this.loadDashboard(table.venueId);
      },
      error: (err) => this.notifications.error(this.getErrorMessage(err, 'No se pudo inactivar la mesa')),
    });
  }

  openSession(table: TableDTO, guestCount: number, observations?: string): void {
    if (!table.id) {
      this.notifications.error('La mesa no tiene identificador');
      return;
    }

    this.saving.set(true);
    this.tableService
      .openSession(table.id, { guestCount, observations })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Sesión abierta');
          this.loadDashboard(table.venueId);
        },
        error: (err) => this.notifications.error(this.getErrorMessage(err, 'No se pudo abrir la sesión')),
      });
  }

  closeSession(table: TableDTO): void {
    const sessionId = table.activeSession?.id;
    if (!table.id || !sessionId) {
      this.notifications.error('No hay sesión activa para cerrar');
      return;
    }

    this.saving.set(true);
    this.tableService
      .closeSession(table.id, sessionId)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Sesión cerrada');
          this.loadDashboard(table.venueId);
        },
        error: (err) => this.notifications.error(this.getErrorMessage(err, 'No se pudo cerrar la sesión')),
      });
  }

  updateSessionGuests(table: TableDTO, guestCount: number): void {
    const sessionId = table.activeSession?.id;
    if (!table.id || !sessionId) {
      this.notifications.error('No hay sesión activa para editar');
      return;
    }

    this.tableService.updateSessionGuests(table.id, sessionId, { guestCount }).subscribe({
      next: () => {
        this.notifications.success('Número de invitados actualizado');
        this.loadDashboard(table.venueId);
      },
      error: (err) => this.notifications.error(this.getErrorMessage(err, 'No se pudo actualizar la sesión')),
    });
  }

  saveReservation(tableId: string, reservation: TableReservationDTO): void {
    this.saving.set(true);
    const operation = reservation.id
      ? this.tableService.updateReservation(tableId, reservation.id, reservation)
      : this.tableService.createReservation(tableId, reservation);

    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notifications.success(reservation.id ? 'Reserva actualizada' : 'Reserva creada');
        this.loadDashboard(this.currentVenueId());
      },
      error: (err) => this.notifications.error(this.getErrorMessage(err, 'No se pudo guardar la reserva')),
    });
  }

  cancelReservation(reservation: TableReservationDTO): void {
    if (!reservation.tableId || !reservation.id) {
      this.notifications.error('La reserva no tiene identificadores completos');
      return;
    }

    this.tableService.deleteReservation(reservation.tableId, reservation.id).subscribe({
      next: () => {
        this.notifications.success('Reserva cancelada');
        this.loadReservations();
      },
      error: (err) => this.notifications.error(this.getErrorMessage(err, 'No se pudo cancelar la reserva')),
    });
  }

seatReservation(reservation: TableReservationDTO): void {
  if (!reservation.id) {
    this.notifications.error('La reserva no tiene identificador');
    return;
  }

  this.tableService.seatReservation(reservation.id, { guestCount: reservation.guestCount ?? 1 }).subscribe({
    next: () => {
      this.notifications.success('Reserva sentada');
      this.loadDashboard(this.currentVenueId());
    },
    error: (err) => this.notifications.error(this.getErrorMessage(err, 'No se pudo sentar la reserva')),
  });
}

  private getErrorMessage(error: unknown, fallback: string): string {
    const err = error as any;
    return err?.backendMessage ?? fallback;
  }

    private currentVenueId(): string {
    return this.authService.getLocationId() || DEFAULT_TABLE_VENUE_ID;
  }


  private patchSummaryActivityCounts(): void {
    this.summary.update((summary) =>
      summary
        ? {
            ...summary,
            activeSessions: this.sessions().filter((session) => !session.closedAt).length,
            activeReservations: this.reservations().length,
          }
        : summary,
    );
  }
}