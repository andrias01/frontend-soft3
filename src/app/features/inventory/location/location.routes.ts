import { Routes } from '@angular/router';

export const LOCATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/location-list/location-list.component').then(m => m.LocationListComponent)
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/location-form/location-form.component').then(m => m.LocationFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/location-form/location-form.component').then(m => m.LocationFormComponent)
  }
];