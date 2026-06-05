import { Routes } from '@angular/router';

/**
 * Rutas del módulo CashReceipt.
 *
 * Estas rutas son hijas del segmento /payment/cashreceipt
 * definido en app.routes.ts.
 *
 * Cómo agregar nuevas rutas para esta feature:
 *  1. Crea el componente en pages/ (e.g. pages/cash-receipt-detail/).
 *  2. Agrega la ruta aquí con loadComponent de forma lazy.
 *  3. Actualiza el sidebar en LayoutComponent si necesitas un enlace directo.
 */
export const CASH_RECEIPT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cash-receipt-list/cash-receipt-list.component').then(
        m => m.CashReceiptListComponent
      )
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/cash-receipt-create/cash-receipt-create.component').then(
        m => m.CashReceiptCreateComponent
      )
  }
];
