import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';

import {
  TableReservationDTO,
  TableDTO,
  TableQueryParams,
  TableSessionDTO,
  TableSessionUpdateDTO,
  TableSummaryApiDTO,
  TableSummaryDTO,
} from '../models/table.models';
import { MOCK_RESERVATIONS, MOCK_SESSIONS, MOCK_SUMMARY, MOCK_TABLES } from '../utils/table.mocks';
import { TABLES_API_BASE_URL, TABLES_AUTH_TOKEN_STORAGE_KEY, USE_TABLES_MOCKS, USE_TABLES_AUTH_FROM_STORAGE } from '../utils/table.constants';

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly baseUrl = TABLES_API_BASE_URL;
  private readonly useMocks = USE_TABLES_MOCKS || !this.http;

  createTable(payload: TableDTO): Observable<TableDTO> {
    if (this.useMocks) {
      return this.mock({ ...payload, id: crypto.randomUUID() });
    }

    const { id, status, active, activeSession, activeReservation, createdDate, modifiedDate, reserved, canOpenNow, canOpenWithReservation, displayStatus, nextReservationAt, reservationLockStartsAt, reservationGraceEndsAt, ...cleanPayload } = payload as any;

    return this.http!.post<TableDTO>(this.baseUrl, cleanPayload, this.requestOptions()).pipe(this.handleError<TableDTO>());
  }

  updateTable(tableId: string, payload: TableDTO): Observable<TableDTO> {
    if (this.useMocks) {
      return this.mock({ ...payload, id: tableId });
    }

    const { id, status, active, activeSession, activeReservation, createdDate, modifiedDate, reserved, canOpenNow, canOpenWithReservation, displayStatus, nextReservationAt, reservationLockStartsAt, reservationGraceEndsAt, ...cleanPayload } = payload as any;

    return this.http!.put<TableDTO>(`${this.baseUrl}/${tableId}`, cleanPayload, this.requestOptions()).pipe(this.handleError<TableDTO>());
  }

  deleteTable(tableId: string): Observable<void> {
    if (this.useMocks) {
      return this.mock(undefined);
    }

    return this.http!.delete<void>(`${this.baseUrl}/${tableId}`, this.requestOptions()).pipe(this.handleError<void>());
  }

  getTables(params: TableQueryParams = {}): Observable<TableDTO[]> {
    if (this.useMocks) {
      return this.mock(this.filterTables(MOCK_TABLES, params));
    }

    return this.http!.get<TableDTO[]>(this.baseUrl, this.requestOptions(this.toHttpParams(params))).pipe(this.handleError<TableDTO[]>());
  }

  getTable(tableId: string): Observable<TableDTO> {
    if (this.useMocks) {
      const table = MOCK_TABLES.find((item) => item.id === tableId) ?? MOCK_TABLES[0];
      return this.mock(table);
    }

    return this.http!.get<TableDTO>(`${this.baseUrl}/${tableId}`, this.requestOptions()).pipe(this.handleError<TableDTO>());
  }

  getTablesByVenue(venueId: string): Observable<TableDTO[]> {
    if (this.useMocks) {
      return this.mock(MOCK_TABLES.filter((table) => table.venueId === venueId));
    }

    return this.http!.get<TableDTO[]>(`${this.baseUrl}/venue/${venueId}`, this.requestOptions()).pipe(this.handleError<TableDTO[]>());
  }

  openSession(tableId: string, payload: TableSessionDTO): Observable<TableSessionDTO> {
    if (this.useMocks) {
      return this.mock({ ...payload, id: crypto.randomUUID(), tableId, openedAt: new Date().toISOString() });
    }

    const { tableId: _, id, openedAt, closedAt, durationMinutes, durationText, ...cleanPayload } = payload as any;

    return this.http!
      .post<TableSessionDTO>(`${this.baseUrl}/${tableId}/sessions`, cleanPayload, this.requestOptions())
      .pipe(this.handleError<TableSessionDTO>());
  }

  getActiveSession(tableId: string): Observable<TableSessionDTO> {
    if (this.useMocks) {
      return this.mock(MOCK_SESSIONS.find((session) => session.tableId === tableId) ?? { tableId, guestCount: 0 });
    }

    return this.http!.get<TableSessionDTO>(`${this.baseUrl}/${tableId}/sessions/active`, this.requestOptions()).pipe(this.handleError<TableSessionDTO>());
  }

  getTableSessions(tableId: string): Observable<TableSessionDTO[]> {
    if (this.useMocks) {
      return this.mock(MOCK_SESSIONS.filter((session) => session.tableId === tableId));
    }

    return this.http!.get<TableSessionDTO[]>(`${this.baseUrl}/${tableId}/sessions`, this.requestOptions()).pipe(this.handleError<TableSessionDTO[]>());
  }

  updateSessionGuests(tableId: string, sessionId: string, payload: TableSessionUpdateDTO): Observable<TableSessionDTO> {
    if (this.useMocks) {
      return this.mock({ id: sessionId, tableId, guestCount: payload.guestCount });
    }

    const params = new HttpParams().set('guestCount', payload.guestCount);
    return this.http!
      .patch<TableSessionDTO>(`${this.baseUrl}/${tableId}/sessions/${sessionId}/guests`, null, this.requestOptions(params))
      .pipe(this.handleError<TableSessionDTO>());
  }

  closeSession(tableId: string, sessionId: string): Observable<TableSessionDTO> {
    if (this.useMocks) {
      return this.mock({ id: sessionId, tableId, guestCount: 0, closedAt: new Date().toISOString() });
    }

    return this.http!
      .post<TableSessionDTO>(`${this.baseUrl}/${tableId}/sessions/${sessionId}/close`, {}, this.requestOptions())
      .pipe(this.handleError<TableSessionDTO>());
  }

  getTableSessionsHistory(tableId: string): Observable<TableSessionDTO[]> {
    if (this.useMocks) {
      return this.mock(MOCK_SESSIONS.filter((session) => session.tableId === tableId));
    }

    return this.http!.get<TableSessionDTO[]>(`${this.baseUrl}/${tableId}/sessions/history`, this.requestOptions()).pipe(this.handleError<TableSessionDTO[]>());
  }

  getSessions(): Observable<TableSessionDTO[]> {
    if (this.useMocks) {
      return this.mock(MOCK_SESSIONS);
    }

    return this.http!.get<TableSessionDTO[]>(`${this.baseUrl}/sessions`, this.requestOptions()).pipe(this.handleError<TableSessionDTO[]>());
  }

  createReservation(tableId: string, payload: TableReservationDTO): Observable<TableReservationDTO> {
    if (this.useMocks) {
      return this.mock({ ...payload, id: crypto.randomUUID(), tableId });
    }

    const { id, status, tableId: _, createdDate, reservationDateTime, reservationLockStartsAt, reservationGraceEndsAt, ...cleanPayload } = payload as any;

    return this.http!
      .post<TableReservationDTO>(`${this.baseUrl}/${tableId}/reservations`, cleanPayload, this.requestOptions())
      .pipe(this.handleError<TableReservationDTO>());
  }

  updateReservation(tableId: string, reservationId: string, payload: TableReservationDTO): Observable<TableReservationDTO> {
    if (this.useMocks) {
      return this.mock({ ...payload, id: reservationId, tableId });
    }

    const { id, tableId: _, status, createdDate, reservationDateTime, reservationLockStartsAt, reservationGraceEndsAt, ...cleanPayload } = payload as any;

    return this.http!
      .put<TableReservationDTO>(`${this.baseUrl}/${tableId}/reservations/${reservationId}`, cleanPayload, this.requestOptions())
      .pipe(this.handleError<TableReservationDTO>());
  }

  deleteReservation(tableId: string, reservationId: string): Observable<void> {
    if (this.useMocks) {
      return this.mock(undefined);
    }

    return this.http!.delete<void>(`${this.baseUrl}/${tableId}/reservations/${reservationId}`, this.requestOptions()).pipe(this.handleError<void>());
  }

  getActiveReservation(tableId: string): Observable<TableReservationDTO> {
    if (this.useMocks) {
      return this.mock(MOCK_RESERVATIONS.find((reservation) => reservation.tableId === tableId) ?? MOCK_RESERVATIONS[0]);
    }

    return this.http!.get<TableReservationDTO>(`${this.baseUrl}/${tableId}/reservation`, this.requestOptions()).pipe(this.handleError<TableReservationDTO>());
  }

  getTableReservations(tableId: string): Observable<TableReservationDTO[]> {
    if (this.useMocks) {
      return this.mock(MOCK_RESERVATIONS.filter((reservation) => reservation.tableId === tableId));
    }

    return this.http!.get<TableReservationDTO[]>(`${this.baseUrl}/${tableId}/reservations`, this.requestOptions()).pipe(this.handleError<TableReservationDTO[]>());
  }

  getActiveReservations(): Observable<TableReservationDTO[]> {
    if (this.useMocks) {
      return this.mock(MOCK_RESERVATIONS);
    }

    return this.http!.get<TableReservationDTO[]>(`${this.baseUrl}/reservations/active`, this.requestOptions()).pipe(this.handleError<TableReservationDTO[]>());
  }

  searchReservations(guestDocumentNumber: string): Observable<TableReservationDTO[]> {
    if (this.useMocks) {
      return this.mock(MOCK_RESERVATIONS.filter((reservation) => reservation.guestDocumentNumber.includes(guestDocumentNumber)));
    }

    const params = new HttpParams().set('guestDocumentNumber', guestDocumentNumber);
    return this.http!.get<TableReservationDTO[]>(`${this.baseUrl}/reservations/search`, this.requestOptions(params)).pipe(this.handleError<TableReservationDTO[]>());
  }

seatReservation(reservationId: string, payload: TableSessionDTO): Observable<TableSessionDTO> {
  if (this.useMocks) {
    const reservation = MOCK_RESERVATIONS.find((item) => item.id === reservationId) ?? MOCK_RESERVATIONS[0];
    return this.mock({
      id: crypto.randomUUID(),
      tableId: reservation.tableId,
      reservationId,
      guestCount: payload.guestCount,
      openedAt: new Date().toISOString(),
    });
  }

  return this.http!
    .post<TableSessionDTO>(`${this.baseUrl}/reservations/${reservationId}/seat`, payload, this.requestOptions())
    .pipe(this.handleError<TableSessionDTO>());
}

  getSummary(): Observable<TableSummaryDTO> {
    if (this.useMocks) {
      return this.mock(MOCK_SUMMARY);
    }

    return this.http!.get<TableSummaryApiDTO>(`${this.baseUrl}/summary`, this.requestOptions()).pipe(
      map((summary) => this.normalizeSummary(summary)),
      this.handleError<TableSummaryDTO>(),
    );
  }

  getSummaryByVenue(venueId: string): Observable<TableSummaryDTO> {
    if (this.useMocks) {
      return this.mock(MOCK_SUMMARY);
    }

    return this.http!.get<TableSummaryApiDTO>(`${this.baseUrl}/summary/venue/${venueId}`, this.requestOptions()).pipe(
      map((summary) => this.normalizeSummary(summary)),
      this.handleError<TableSummaryDTO>(),
    );
  }

  private toHttpParams(params: TableQueryParams): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }

  private filterTables(tables: TableDTO[], params: TableQueryParams): TableDTO[] {
    return tables.filter((table) => {
      const statusMatches = params.status ? table.status === params.status : true;
      const venueMatches = params.venueId ? table.venueId === params.venueId : true;
      const reservedMatches = params.reserved === undefined ? true : table.reserved === params.reserved;
      const openNowMatches = params.canOpenNow === undefined ? true : table.canOpenNow === params.canOpenNow;
      return statusMatches && venueMatches && reservedMatches && openNowMatches;
    });
  }

  private handleError<T>() {
    return catchError((error: unknown) => {
      const httpError = error as any;
      const message = httpError?.error?.message ?? httpError?.message ?? null;
      return throwError(() => ({ ...httpError, backendMessage: message }));
    }) as (source: Observable<T>) => Observable<T>;
  }

  private normalizeSummary(summary: TableSummaryApiDTO): TableSummaryDTO {
    const totalTables = Number(summary.totalRegistered ?? 0);
    const availableTables = Number(summary.available ?? 0);
    const occupiedTables = Number(summary.occupied ?? 0);
    const reservedTables = Number(summary.reserved ?? 0);
    const blockedForReservation = Number(summary.blockedForReservation ?? 0);

    return {
      totalTables,
      availableTables,
      occupiedTables,
      reservedTables,
      inactiveTables: blockedForReservation,
      activeSessions: 0,
      activeReservations: 0,
      occupancyRate: this.safePercent(occupiedTables, totalTables),
      reservationRate: this.safePercent(reservedTables, totalTables),
      blockedForReservation,
      venueId: summary.venueId,
    };
  }

  private safePercent(value: number, total: number): number {
    return total <= 0 ? 0 : Math.round((value / total) * 100);
  }

  private requestOptions(params?: HttpParams): { headers: HttpHeaders; params?: HttpParams } {
    let headers = new HttpHeaders();

    if (USE_TABLES_AUTH_FROM_STORAGE) {
      const token = localStorage.getItem(TABLES_AUTH_TOKEN_STORAGE_KEY)?.trim();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return params ? { headers, params } : { headers };
  }

  private mock<T>(value: T): Observable<T> {
    return of(value).pipe(delay(350));
  }
}