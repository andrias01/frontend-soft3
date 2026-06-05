import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TableStatus } from '../models/table.enums';
import { TableFilters } from '../models/table.models';

@Component({
  selector: 'eatup-table-filters',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="filters">
      <label class="search">
        <span>Buscar</span>
        <input
          type="search"
          [ngModel]="filters().search"
          (ngModelChange)="update({ search: $event })"
          placeholder="Mesa, ubicación o estado"
        />
      </label>

      <label>
        <span>Estado</span>
        <select [ngModel]="filters().status" (ngModelChange)="update({ status: $event })">
          <option value="">Todos</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ statusLabel(status) }}</option>
          }
        </select>
      </label>

      <label>
        <span>Reservada</span>
        <select [ngModel]="reservedValue()" (ngModelChange)="updateNullableBoolean('reserved', $event)">
          <option value="">Todas</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </label>

      <label>
        <span>Abrir ahora</span>
        <select [ngModel]="openNowValue()" (ngModelChange)="updateNullableBoolean('canOpenNow', $event)">
          <option value="">Todas</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </label>

      <button type="button" class="ghost" (click)="reset.emit()">Limpiar</button>
    </section>
  `,
  styles: [
    `
      .filters {
        align-items: end;
        background: #FFF8F2;
        border: 1px solid rgba(27, 27, 27, 0.1);
        border-radius: 8px;
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(220px, 1fr) 160px 140px 150px auto;
        padding: 16px;
      }

      label {
        display: grid;
        gap: 7px;
      }

      span {
        color: #1B1B1B;
        font-size: 12px;
        font-weight: 700;
      }

      input,
      select {
        background: #fff;
        border: 1px solid #D9D4CD;
        border-radius: 8px;
        color: #222222;
        font: inherit;
        height: 42px;
        outline: none;
        padding: 0 12px;
        transition:
          border 160ms ease,
          box-shadow 160ms ease;
      }

      input:focus,
      select:focus {
        border-color: #2EC4B6;
        box-shadow: 0 0 0 3px rgba(46, 196, 182, 0.16);
      }

      .ghost {
        background: rgba(46, 196, 182, 0.12);
        border: 0;
        border-radius: 8px;
        color: #2EC4B6;
        cursor: pointer;
        font-weight: 700;
        height: 42px;
        padding: 0 16px;
      }

      @media (max-width: 920px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 560px) {
        .filters {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TableFiltersComponent {
  readonly filters = input.required<TableFilters>();
  readonly filtersChange = output<Partial<TableFilters>>();
  readonly reset = output<void>();

  readonly statuses = Object.values(TableStatus);
  readonly reservedValue = computed(() => this.booleanToSelect(this.filters().reserved));
  readonly openNowValue = computed(() => this.booleanToSelect(this.filters().canOpenNow));

  update(filters: Partial<TableFilters>): void {
    this.filtersChange.emit(filters);
  }

  updateNullableBoolean(key: 'reserved' | 'canOpenNow', value: string): void {
    this.filtersChange.emit({ [key]: value === '' ? null : value === 'true' });
  }

  statusLabel(status: TableStatus): string {
    const labels: Record<TableStatus, string> = {
      [TableStatus.AVAILABLE]: 'Disponible',
      [TableStatus.OCCUPIED]: 'Ocupada',
      [TableStatus.RESERVED]: 'Reservada',
      [TableStatus.INACTIVE]: 'Inactiva',
    };
    return labels[status];
  }

  private booleanToSelect(value: boolean | null): string {
    if (value === null) {
      return '';
    }

    return String(value);
  }
}
