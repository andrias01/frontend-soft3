import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-discount-status-badge',
  standalone: true,
  imports: [],
  template: `<span class="badge" [class.active]="active()" [class.inactive]="!active()">{{ label() }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0 10px;
      min-height: 24px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .badge.active   { background: #dcfce7; color: #15803d; }
    .badge.inactive { background: #f1f5f9; color: #475569; }
  `
})
export class DiscountStatusBadgeComponent {
  readonly active = input<boolean>(false);
  readonly label  = computed(() => this.active() ? 'Activo' : 'Inactivo');
}