import { ReservationStatus, TableStatus } from './table.enums';

export interface TableDTO {
  id?: string;
  tableNumber: number;
  location: string;
  isVip?: boolean;
  hasView?: boolean;
  isAccessible?: boolean;
  venueId: string;
  status?: TableStatus;
  active?: boolean;
  reserved?: boolean;
  canOpenNow?: boolean;
  canOpenWithReservation?: boolean;
  displayStatus?: string;
  activeSession?: TableSessionDTO;
  activeReservation?: TableReservationDTO;
  nextReservationAt?: string;
  reservationLockStartsAt?: string;
  reservationGraceEndsAt?: string;
  createdDate?: string;
  modifiedDate?: string;
}

export interface TableSessionDTO {
  id?: string;
  tableId?: string;
  reservationId?: string;
  guestCount: number;
  waiterId?: string;
  openedAt?: string;
  closedAt?: string;
  durationMinutes?: number;
  durationText?: string;
  observations?: string;
}

export interface TableSessionUpdateDTO {
  guestCount: number;
}

export interface TableReservationDTO {
  id?: string;
  tableId?: string;
  reservationDate: string;
  reservationTime: string;
  reservationDateTime?: string;
  reservationLockStartsAt?: string;
  reservationGraceEndsAt?: string;
  guestName: string;
  guestDocumentNumber: string;
  guestCount: number;
  status?: ReservationStatus;
  createdDate?: string;
}

export interface TableSummaryDTO {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  inactiveTables: number;
  activeSessions: number;
  activeReservations: number;
  occupancyRate: number;
  reservationRate: number;
  venueId?: string;
  blockedForReservation?: number;
}

export interface TableSummaryApiDTO {
  totalRegistered?: number;
  available?: number;
  occupied?: number;
  reserved?: number;
  blockedForReservation?: number;
  venueId?: string;
}

export interface TableFilters {
  search: string;
  venueId: string;
  status: TableStatus | '';
  reserved: boolean | null;
  canOpenNow: boolean | null;
}

export interface TableQueryParams {
  status?: TableStatus;
  venueId?: string;
  reserved?: boolean;
  canOpenNow?: boolean;
}

export interface TableDialogResult<T> {
  confirmed: boolean;
  data?: T;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface SnackMessage {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}
