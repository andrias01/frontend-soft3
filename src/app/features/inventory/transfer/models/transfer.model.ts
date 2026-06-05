export type TransferStatus =
  | 'EN_PROCESO'
  | 'EN_TRANSITO'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'RECLAMADO';

export interface TransferResponse {
  idTraslado: number;
  sedeOrigen: string;
  sedeDestino: string;
  fechaEnvio: string;
  fechaLlegada: string;
  responsable: string;
  producto: string;
  stock: number | null;
  cantidad: number;
  observaciones: string | null;
  estado: TransferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferRequest {
  sedeOrigen: string;
  sedeDestino: string;
  fechaEnvio: string;
  fechaLlegada: string;
  responsable: string;
  producto: string;
  cantidad: number;
  observaciones?: string;
}

export interface TransferStatusUpdateRequest {
  estado: TransferStatus;
}

export interface TransferClaimRequest {
  observaciones: string;
}

export type TransferListFilter =
  | 'TODOS'
  | 'ENTRANTES'
  | 'SALIENTES'
  | 'EN_TRANSITO'
  | 'COMPLETADOS'
  | 'CANCELADOS'
  | 'RECLAMADOS';
