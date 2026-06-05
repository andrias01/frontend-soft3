import { Routes } from '@angular/router';

export const CLIENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/client-list/client-list').then((m) => m.ClientList),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/client-form/client-form').then((m) => m.ClientForm),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/client-form/client-form').then((m) => m.ClientForm),
  },
];
