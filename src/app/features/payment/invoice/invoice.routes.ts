import { Routes } from '@angular/router';

export const INVOICE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/invoice-page/invoice-page.component').then(m => m.InvoicePageComponent)
  }
];
