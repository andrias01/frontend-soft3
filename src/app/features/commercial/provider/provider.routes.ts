import { Routes } from '@angular/router';

export const PROVIDER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/provider-list/provider-list.component').then((m) => m.ProviderListComponent),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/provider-form-page/provider-form-page').then((m) => m.ProviderFormPage),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/provider-form-page/provider-form-page').then((m) => m.ProviderFormPage),
  },
];
