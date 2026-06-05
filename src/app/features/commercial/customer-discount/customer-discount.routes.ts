import { Routes } from '@angular/router';

export const CUSTOMER_DISCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/customer-discount-list-page/customer-discount-list-page')
      .then(m => m.CustomerDiscountListPage)
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/customer-discount-form-page/customer-discount-form-page')
      .then(m => m.CustomerDiscountFormPage)
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/customer-discount-detail-page/customer-discount-detail-page')
      .then(m => m.CustomerDiscountDetailPage)
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./pages/customer-discount-form-page/customer-discount-form-page')
      .then(m => m.CustomerDiscountFormPage)
  }
];