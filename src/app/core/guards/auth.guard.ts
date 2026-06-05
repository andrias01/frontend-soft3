import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@features/user/services/auth.service';

export const DEFAULT_AUTHENTICATED_ROUTE = '/commercial/sales';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasValidSession()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

export const guestGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasValidSession()) {
    return true;
  }

  const returnUrl = route.queryParamMap.get('returnUrl');

  if (returnUrl && returnUrl !== '/login') {
    return router.createUrlTree([returnUrl]);
  }

  return router.createUrlTree([DEFAULT_AUTHENTICATED_ROUTE]);
};
