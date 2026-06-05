import { Component, OnInit, computed, inject } from '@angular/core';

import { EmptyStateComponent } from '../components/empty-state.component';
import { LoadingSkeletonComponent } from '../components/loading-skeleton.component';
import { StatusBadgeComponent } from '../components/status-badge.component';
import { SummaryCardComponent } from '../components/summary-card.component';
import { DateTimePipe } from '../pipes/date-time.pipe';
import { TablesStore } from '../store/tables.store';

@Component({
  selector: 'eatup-tables-dashboard',
  standalone: true,
  imports: [SummaryCardComponent, LoadingSkeletonComponent, EmptyStateComponent, StatusBadgeComponent, DateTimePipe],
  template: `
    <header class="page-header">
      <div>
        <span>Operación en vivo</span>
        <h1>Información de mesas</h1>
        <p>Disponibilidad, ocupación, sesiones y reservas en una vista operativa.</p>
      </div>
      <button type="button" (click)="store.loadDashboard()">Actualizar</button>
    </header>

    @if (store.loading() && !store.summary()) {
      <eatup-loading-skeleton [rows]="5" />
    } @else if (store.summary(); as summary) {
      <section class="summary-grid">
        <eatup-summary-card label="Total mesas" [value]="summary.totalTables" icon="#" accent="#FF6B35" accentSoft="#FFE6DA" [progress]="100" trend="+12%" />
        <eatup-summary-card label="Disponibles" [value]="summary.availableTables" icon="✓" accent="#22C55E" accentSoft="#DCFCE7" [progress]="percent(summary.availableTables, summary.totalTables)" trend="+8%" />
        <eatup-summary-card label="Ocupadas" [value]="summary.occupiedTables" icon="●" accent="#EF4444" accentSoft="#FEE2E2" [progress]="summary.occupancyRate" trend="+4%" />
        <eatup-summary-card label="Reservadas" [value]="summary.reservedTables" icon="◷" accent="#FF6B35" accentSoft="#FFE6DA" [progress]="summary.reservationRate" trend="-2%" trendDirection="down" />
        <eatup-summary-card label="Sesiones activas" [value]="summary.activeSessions" icon="↗" accent="#2EC4B6" accentSoft="#D6FAF5" [progress]="percent(summary.activeSessions, summary.totalTables)" trend="+6%" />
        <eatup-summary-card label="Reservas activas" [value]="summary.activeReservations" icon="◇" accent="#2EC4B6" accentSoft="#D6FAF5" [progress]="percent(summary.activeReservations, summary.totalTables)" trend="+10%" />
      </section>

      <section class="analytics-grid">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>Distribución de estados</h2>
              <p>Lectura rápida del piso por estado operativo.</p>
            </div>
          </div>
          <div class="bars">
            @for (item of statusBars(); track item.label) {
              <div class="bar-row">
                <span>{{ item.label }}</span>
                <div><i [style.width.%]="item.value" [style.background]="item.color"></i></div>
                <strong>{{ item.value }}%</strong>
              </div>
            }
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>Próximas reservas</h2>
              <p>Mesas con bloqueo o reserva cercana.</p>
            </div>
          </div>
          <div class="reservation-list">
            @for (table of reservedTables(); track table.id) {
              <div class="reservation-row">
                <div>
                  <strong>Mesa {{ table.tableNumber }}</strong>
                  <span>{{ table.location }} · {{ table.nextReservationAt | eatupDateTime }}</span>
                </div>
                <eatup-status-badge
                  [status]="table.displayStatus ?? table.status"/>
              </div>
            } @empty {
              <eatup-empty-state title="Sin reservas próximas" description="Cuando haya reservas activas aparecerán aquí." />
            }
          </div>
        </article>
      </section>
    }
  `,
  styleUrl: './tables-pages.css',
})
export class TablesDashboardPage implements OnInit {
  readonly store = inject(TablesStore);
  readonly reservedTables = computed(() => this.store.tables().filter((table) => table.reserved || table.nextReservationAt));

  ngOnInit(): void {
    this.store.loadDashboard();
  }

  percent(value: number, total: number): number {
    return total <= 0 ? 0 : Math.round((value / total) * 100);
  }

  statusBars(): Array<{ label: string; value: number; color: string }> {
    const summary = this.store.summary();
    if (!summary) {
      return [];
    }

    return [
      { label: 'Disponibles', value: this.percent(summary.availableTables, summary.totalTables), color: '#22C55E' },
      { label: 'Ocupadas', value: this.percent(summary.occupiedTables, summary.totalTables), color: '#EF4444' },
      { label: 'Reservadas', value: this.percent(summary.reservedTables, summary.totalTables), color: '#F59E0B' },
      { label: 'Bloqueadas', value: this.percent(summary.blockedForReservation ?? summary.inactiveTables, summary.totalTables), color: '#64748B' },
    ];
  }
}
