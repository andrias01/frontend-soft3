import { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/login-page/login-page.component').then(
        m => m.LoginPageComponent
      )
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register-page/register-page.component').then(
        m => m.RegisterPageComponent
      )
  }
];
