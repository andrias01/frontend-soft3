import { Component, computed, input } from '@angular/core';

import { ReservationStatus, TableStatus } from '../models/table.enums';
import { RESERVATION_STATUS_LABELS, TABLE_STATUS_LABELS } from '../utils/table.constants';

@Component({
  selector: 'eatup-status-badge',
  standalone: true,
  template: `<span class="badge" [class]="variant()">{{ label() }}</span>`,
  styles: [
    `
      .badge {
        align-items: center;
        border-radius: 999px;
        display: inline-flex;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        min-height: 24px;
        padding: 0 10px;
        white-space: nowrap;
      }

      .AVAILABLE,
      .CONFIRMED,
      .COMPLETED,
      .SEATED {
        background: #dcfce7;
        color: #15803d;
      }

      .AVAILABLE_WITH_RESERVATION {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .BLOCKED_FOR_RESERVATION,
      .WAITING_RESERVED_GUEST,
      .RESERVED,
      .PENDING {
        background: #fef3c7;
        color: #b45309;
      }

      .OCCUPIED,
      .OCCUPIED_WITH_RESERVATION,
      .OCCUPIED_WITH_IMMINENT_RESERVATION,
      .CANCELLED {
        background: #fee2e2;
        color: #b91c1c;
      }

      .INACTIVE {
        background: #f1f5f9;
        color: #475569;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  readonly status = input<string | TableStatus | ReservationStatus | undefined>();

  readonly variant = computed(() => this.status() ?? TableStatus.INACTIVE);

  readonly label = computed(() => {
    const status = this.status();

    if (!status) {
      return 'Sin estado';
    }

    switch (status) {
      case 'AVAILABLE':
        return 'Disponible';

      case 'AVAILABLE_WITH_RESERVATION':
        return 'Disponible con reserva';

      case 'BLOCKED_FOR_RESERVATION':
        return 'Bloqueada por reserva';

      case 'WAITING_RESERVED_GUEST':
        return 'Esperando cliente';

      case 'OCCUPIED':
        return 'Ocupada';

      case 'OCCUPIED_WITH_RESERVATION':
        return 'Ocupada con reserva';

      case 'OCCUPIED_WITH_IMMINENT_RESERVATION':
        return 'Ocupada · reserva próxima';

      default:
        if (status in TABLE_STATUS_LABELS) {
          return TABLE_STATUS_LABELS[status as TableStatus];
        }

        return RESERVATION_STATUS_LABELS[status as ReservationStatus];
    }
  });
}