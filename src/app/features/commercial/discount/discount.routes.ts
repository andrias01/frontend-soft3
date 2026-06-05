import { Routes } from '@angular/router';

export const DISCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/discount-list-page/discount-list-page')
        .then(m => m.DiscountListPage)
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/discount-form-page/discount-form-page')
        .then(m => m.DiscountFormPage)
  },
  { path: ':id', loadComponent: () => import('./pages/discount-detail-page/discount-detail-page').then(m => m.DiscountDetailPage) },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/discount-form-page/discount-form-page')
        .then(m => m.DiscountFormPage)
  }
];