import { Routes } from '@angular/router';

export const SELLER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/seller-list/seller-list.component').then((m) => m.SellerListComponent),
  },
];
