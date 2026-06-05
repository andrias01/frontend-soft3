import { ReservationStatus, TableStatus } from '../models/table.enums';
import { TableDTO, TableReservationDTO, TableSessionDTO, TableSummaryDTO } from '../models/table.models';
import { DEFAULT_TABLE_VENUE_ID } from './table.constants';

const now = new Date();

function isoFromNow(minutes: number): string {
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}

export const MOCK_TABLES: TableDTO[] = [
  {
    id: 'tbl-01',
    tableNumber: 1,
    location: 'Terraza norte',
    isVip: true,
    hasView: true,
    isAccessible: false,
    venueId: DEFAULT_TABLE_VENUE_ID,
    status: TableStatus.AVAILABLE,
    active: true,
    reserved: false,
    canOpenNow: true,
    canOpenWithReservation: true,
    nextReservationAt: isoFromNow(180),
  },
  {
    id: 'tbl-02',
    tableNumber: 2,
    location: 'Salón principal',
    isVip: false,
    hasView: false,
    isAccessible: true,
    venueId: DEFAULT_TABLE_VENUE_ID,
    status: TableStatus.OCCUPIED,
    active: true,
    reserved: false,
    canOpenNow: false,
    activeSession: {
      id: 'ses-01',
      tableId: 'tbl-02',
      guestCount: 4,
      waiterId: 'waiter-09',
      openedAt: isoFromNow(-75),
      durationMinutes: 75,
      durationText: '1 h 15 min',
      observations: 'Celebración de cumpleaños',
    },
  },
  {
    id: 'tbl-03',
    tableNumber: 3,
    location: 'Bar',
    isVip: false,
    hasView: true,
    isAccessible: false,
    venueId: DEFAULT_TABLE_VENUE_ID,
    status: TableStatus.RESERVED,
    active: true,
    reserved: true,
    canOpenNow: false,
    canOpenWithReservation: true,
    activeReservation: {
      id: 'res-01',
      tableId: 'tbl-03',
      reservationDate: now.toISOString().slice(0, 10),
      reservationTime: '20:30',
      reservationDateTime: isoFromNow(90),
      guestName: 'Laura Mejía',
      guestDocumentNumber: '1020304050',
      guestCount: 3,
      status: ReservationStatus.CONFIRMED,
      createdDate: isoFromNow(-1440),
    },
    nextReservationAt: isoFromNow(90),
    reservationLockStartsAt: isoFromNow(60),
    reservationGraceEndsAt: isoFromNow(120),
  },
  {
    id: 'tbl-04',
    tableNumber: 4,
    location: 'Salón privado',
    isVip: true,
    hasView: false,
    isAccessible: true,
    venueId: DEFAULT_TABLE_VENUE_ID,
    status: TableStatus.INACTIVE,
    active: false,
    reserved: false,
    canOpenNow: false,
  },
  {
    id: 'tbl-05',
    tableNumber: 5,
    location: 'Terraza sur',
    isVip: false,
    hasView: true,
    isAccessible: true,
    venueId: DEFAULT_TABLE_VENUE_ID,
    status: TableStatus.AVAILABLE,
    active: true,
    reserved: false,
    canOpenNow: true,
  },
  {
    id: 'tbl-06',
    tableNumber: 6,
    location: 'Salón principal',
    isVip: false,
    hasView: false,
    isAccessible: false,
    venueId: DEFAULT_TABLE_VENUE_ID,
    status: TableStatus.OCCUPIED,
    active: true,
    reserved: false,
    canOpenNow: false,
    activeSession: {
      id: 'ses-02',
      tableId: 'tbl-06',
      guestCount: 2,
      waiterId: 'waiter-03',
      openedAt: isoFromNow(-34),
      durationMinutes: 34,
      durationText: '34 min',
    },
  },
];

export const MOCK_SESSIONS: TableSessionDTO[] = MOCK_TABLES
  .map((table) => table.activeSession)
  .filter((session): session is TableSessionDTO => Boolean(session));

export const MOCK_RESERVATIONS: TableReservationDTO[] = [
  ...MOCK_TABLES.map((table) => table.activeReservation).filter((reservation): reservation is TableReservationDTO => Boolean(reservation)),
  {
    id: 'res-02',
    tableId: 'tbl-01',
    reservationDate: now.toISOString().slice(0, 10),
    reservationTime: '21:15',
    reservationDateTime: isoFromNow(180),
    guestName: 'Mateo Ríos',
    guestDocumentNumber: '11223344',
    guestCount: 5,
    status: ReservationStatus.PENDING,
    createdDate: isoFromNow(-300),
  },
];

export const MOCK_SUMMARY: TableSummaryDTO = {
  totalTables: MOCK_TABLES.length,
  availableTables: MOCK_TABLES.filter((table) => table.status === TableStatus.AVAILABLE).length,
  occupiedTables: MOCK_TABLES.filter((table) => table.status === TableStatus.OCCUPIED).length,
  reservedTables: MOCK_TABLES.filter((table) => table.status === TableStatus.RESERVED).length,
  inactiveTables: MOCK_TABLES.filter((table) => table.status === TableStatus.INACTIVE).length,
  activeSessions: MOCK_SESSIONS.length,
  activeReservations: MOCK_RESERVATIONS.filter((reservation) =>
    [ReservationStatus.PENDING, ReservationStatus.CONFIRMED].includes(reservation.status ?? ReservationStatus.PENDING),
  ).length,
  occupancyRate: Math.round((MOCK_TABLES.filter((table) => table.status === TableStatus.OCCUPIED).length / MOCK_TABLES.length) * 100),
  reservationRate: Math.round((MOCK_TABLES.filter((table) => table.status === TableStatus.RESERVED).length / MOCK_TABLES.length) * 100),
};
