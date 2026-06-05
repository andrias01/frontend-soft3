import { Component } from '@angular/core';

@Component({
  selector: 'app-invoice-placeholder',
  standalone: true,
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Facturas (En desarrollo)</h1>
        <p class="page-subtitle">Esta funcionalidad aún no está implementada en el frontend.</p>
      </div>
    </div>
    <div class="empty-state">
      <p>Próximamente podrás ver y gestionar las facturas desde aquí.</p>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 2rem; }
    .page-title { font-size: 1.75rem; font-weight: 700; color: var(--color-secondary); margin: 0 0 0.25rem 0; }
    .page-subtitle { color: #64748b; margin: 0; font-size: 0.9375rem; }
    .empty-state { text-align: center; padding: 4rem 0; color: #64748b; background: white; border-radius: 0.75rem; border: 1px solid #e2e8f0; }
  `]
})
export class InvoicePlaceholderComponent {}
