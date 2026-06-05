import { Routes } from '@angular/router';

export const PAYMENT_METHOD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/payment-method-list/payment-method-list.component').then(
        m => m.PaymentMethodListComponent
      )
  }
];
