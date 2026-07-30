import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const UNAUTHENTICATED_PATHS = ['/auth/login', '/auth/refresh'];

let refreshInFlight: Promise<string> | null = null;

function isUnauthenticatedRequest(req: HttpRequest<unknown>): boolean {
  return UNAUTHENTICATED_PATHS.some((path) => req.url.includes(path));
}

function withAuthHeader(req: HttpRequest<unknown>, token: string | null) {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (isUnauthenticatedRequest(req)) {
    return next(req);
  }

  const authedReq = withAuthHeader(req, authService.getAccessToken());

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      refreshInFlight ??= authService.refresh().finally(() => {
        refreshInFlight = null;
      });

      return from(refreshInFlight).pipe(
        switchMap((newToken) => next(withAuthHeader(req, newToken))),
        catchError((refreshError: unknown) => {
          void authService.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
