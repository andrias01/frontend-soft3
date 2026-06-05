import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-customer-discount-expiry-badge',
  standalone: true,
  imports: [],
  template: `<span class="badge" [class]="cssClass()">{{ label() }}</span>`,
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
    .badge.none    { background: #dbeafe; color: #1d4ed8; }
    .badge.active  { background: #dcfce7; color: #15803d; }
    .badge.expired { background: #fee2e2; color: #b91c1c; }
  `
})
export class CustomerDiscountExpiryBadgeComponent {
  readonly endDate = input<string | null>(null);

  readonly status = computed(() => {
    const end = this.endDate();
    if (!end) return 'none';
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return end < today ? 'expired' : 'active';
  });

  readonly label = computed(() => {
    switch (this.status()) {
      case 'none':    return 'Sin vencimiento';
      case 'expired': return 'Vencido';
      default:        return 'Vigente';
    }
  });

  readonly cssClass = computed(() => `badge ${this.status()}`);
}