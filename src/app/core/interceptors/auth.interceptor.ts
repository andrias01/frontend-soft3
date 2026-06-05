import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@features/user/services/auth.service';
import { catchError, throwError } from 'rxjs';

const LOGIN_ENDPOINT = '/userapi/v1/users/login';
const REGISTER_USER_ENDPOINT = '/userapi/v1/users';

const PUBLIC_CATALOG_ENDPOINTS = [
  '/userapi/v1/document-types',
  '/userapi/v1/departments',
  '/userapi/v1/cities',
  '/inventory/api/v1/location/active',
  '/inventory/api/v1/location'
];

function isPublicRequest(url: string, method: string): boolean {
  if (url.includes(LOGIN_ENDPOINT)) {
    return true;
  }

  // Registration is public only for user creation requests.
  if (method === 'POST' && url.includes(REGISTER_USER_ENDPOINT)) {
    return true;
  }

  // Listado de sedes público para el registro de usuarios.
  if (method === 'GET' && url.includes('/inventory/api/v1/location')) {
    return true;
  }

  return PUBLIC_CATALOG_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const token = authService.getToken();
  const publicRequest = isPublicRequest(req.url, req.method);

  console.log('>>> INTERCEPTOR', req.url, '| token:', !!token, '| public:', publicRequest);

  // Si hay token, siempre adjuntarlo (incluso en rutas públicas)
  if (token) {
    const requestWithAuth = req.clone({
      withCredentials: true,
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(requestWithAuth).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !authService.hasValidSession()) {
          authService.logout();
          void router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  // Sin token: solo permitir rutas públicas
  if (publicRequest) {
    return next(req.clone({ withCredentials: false }));
  }

  void router.navigate(['/login']);
  return throwError(() => new HttpErrorResponse({
    status: 401,
    statusText: 'No authentication token',
    url: req.url
  }));
};
