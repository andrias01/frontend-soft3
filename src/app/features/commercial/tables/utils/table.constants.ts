import { ReservationStatus, TableStatus } from '../models/table.enums';
import { ENV } from '@config/env.config';

// Construimos la base igual que en `discount` para mantener consistencia
export const TABLES_API_BASE_URL = `${ENV.apiUrl.replace('/api/v1', '')}/commercial/api/v1/tables`;

export const USE_TABLES_MOCKS = false;

export const TABLES_AUTH_TOKEN_STORAGE_KEY = 'eatup_token';

// Si es `true`, `TableService` añadirá el header `Authorization` usando
// el token guardado en `localStorage` (clave: `TABLES_AUTH_TOKEN_STORAGE_KEY`).
// Si es `false`, se asume que un interceptor global (p.ej. `authInterceptor`)
// proporcionará el header (p.ej. usando `ENV.userToken`).
export const USE_TABLES_AUTH_FROM_STORAGE = false;

export const DEFAULT_TABLE_VENUE_ID = '';

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  [TableStatus.AVAILABLE]: 'Disponible',
  [TableStatus.OCCUPIED]: 'Ocupada',
  [TableStatus.RESERVED]: 'Reservada',
  [TableStatus.INACTIVE]: 'Inactiva',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: 'Pendiente',
  [ReservationStatus.CONFIRMED]: 'Confirmada',
  [ReservationStatus.SEATED]: 'Sentada',
  [ReservationStatus.CANCELLED]: 'Cancelada',
  [ReservationStatus.COMPLETED]: 'Completada',
};

export const TABLE_STATUS_COLORS: Record<TableStatus, string> = {
  [TableStatus.AVAILABLE]: '#22C55E',
  [TableStatus.OCCUPIED]: '#EF4444',
  [TableStatus.RESERVED]: '#F59E0B',
  [TableStatus.INACTIVE]: '#64748B',
};

export const TABLE_UI_COLORS = {
  primary: '#FF6B35',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#FFF8F2',
};
