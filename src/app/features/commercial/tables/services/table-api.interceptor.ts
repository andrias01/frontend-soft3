import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { TableNotificationService } from './table-notification.service';

export const tableApiInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(TableNotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      const message =
        error instanceof HttpErrorResponse
          ? error.error?.message ?? error.message ?? 'No se pudo completar la operación'
          : 'No se pudo completar la operación';

      notifications.error(message);
      return throwError(() => error);
    }),
  );
};
