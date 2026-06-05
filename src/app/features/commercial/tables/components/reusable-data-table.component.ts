import { Component, computed, input, output, signal } from '@angular/core';

import { TableColumn } from '../models/table.models';

@Component({
  selector: 'eatup-data-table',
  standalone: true,
  template: `
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            @for (column of columns(); track column.key) {
              <th [class.sortable]="column.sortable" [class]="column.align ?? 'left'" (click)="sort(column)">
                {{ column.label }}
                @if (column.sortable && sortKey() === column.key) {
                  <span>{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
                }
              </th>
            }
            <th class="right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (row of pagedRows(); track rowIndex($index)) {
            <tr>
              @for (column of columns(); track column.key) {
                <td [class]="column.align ?? 'left'">{{ cellValue(row, column.key) }}</td>
              }
              <td class="right">
                <button type="button" (click)="rowAction.emit(row)">Ver</button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <div class="pager">
        <span>{{ rangeLabel() }}</span>
        <div>
          <button type="button" (click)="previousPage()" [disabled]="page() === 0">Anterior</button>
          <button type="button" (click)="nextPage()" [disabled]="page() >= maxPage()">Siguiente</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .table-shell {
        background: #FFF8F2;
        border: 1px solid rgba(27, 27, 27, 0.08);
        border-radius: 8px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
        overflow: auto;
      }

      table {
        border-collapse: collapse;
        min-width: 980px;
        width: 100%;
      }

      th {
        background: #FFF8F2;
        border-bottom: 1px solid rgba(27, 27, 27, 0.08);
        color: #1B1B1B;
        font-size: 12px;
        font-weight: 800;
        padding: 14px 16px;
        text-align: left;
        text-transform: uppercase;
      }

      td {
        border-bottom: 1px solid rgba(27, 27, 27, 0.08);
        color: #222222;
        font-size: 14px;
        padding: 16px;
      }

      th.sortable {
        cursor: pointer;
        user-select: none;
      }

      .right {
        text-align: right;
      }

      .center {
        text-align: center;
      }

      .pager {
        align-items: center;
        border-top: 1px solid rgba(27, 27, 27, 0.08);
        color: #1B1B1B;
        display: flex;
        font-size: 13px;
        justify-content: space-between;
        padding: 14px 16px;
      }

      button {
        background: #FFF8F2;
        border: 1px solid #D9D4CD;
        border-radius: 8px;
        color: #222222;
        cursor: pointer;
        font-weight: 700;
        margin-left: 8px;
        padding: 8px 12px;
      }

      button:disabled {
        color: #A3A3A3;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ReusableDataTableComponent<T extends Record<string, unknown>> {
  readonly columns = input.required<TableColumn<T>[]>();
  readonly rows = input.required<T[]>();
  readonly pageSize = input(8);
  readonly rowAction = output<T>();

  readonly page = signal(0);
  readonly sortKey = signal<string>('');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly sortedRows = computed(() => {
    const rows = [...this.rows()];
    const key = this.sortKey();

    if (!key) {
      return rows;
    }

    return rows.sort((a, b) => {
      const first = String(a[key] ?? '');
      const second = String(b[key] ?? '');
      return this.sortDirection() === 'asc' ? first.localeCompare(second) : second.localeCompare(first);
    });
  });

  readonly pagedRows = computed(() => {
    const start = this.page() * this.pageSize();
    return this.sortedRows().slice(start, start + this.pageSize());
  });

  sort(column: TableColumn<T>): void {
    if (!column.sortable) {
      return;
    }

    const key = String(column.key);
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  previousPage(): void {
    this.page.update((page) => Math.max(0, page - 1));
  }

  nextPage(): void {
    this.page.update((page) => Math.min(this.maxPage(), page + 1));
  }

  maxPage(): number {
    return Math.max(0, Math.ceil(this.rows().length / this.pageSize()) - 1);
  }

  rangeLabel(): string {
    if (this.rows().length === 0) {
      return '0 resultados';
    }

    const start = this.page() * this.pageSize() + 1;
    const end = Math.min(this.rows().length, start + this.pageSize() - 1);
    return `${start}-${end} de ${this.rows().length}`;
  }

  rowIndex(index: number): number {
    return this.page() * this.pageSize() + index;
  }

  cellValue(row: T, key: keyof T | string): string {
    const value = row[String(key)];
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    return value === undefined || value === null ? '-' : String(value);
  }
}
