import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ENV } from '@config/env.config';
import { LoginRequest, LoginResponse } from '../models/login.model';

export const TOKEN_STORAGE_KEY = 'eatup_auth_token';
export const LOCATION_STORAGE_KEY = 'eatup_location_id';

interface JwtPayload {
  sub?: string;
  email?: string;
}

interface UserSummaryResponse {
  id: string;
  email: string;
  location?: string;
  locationId?: string;
}

interface LocationOption {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = ENV.apiUrl.replace('/api/v1', '');

  private readonly _token = signal<string | null>(
    this.readToken()
  );

  private readonly _locationId = signal<string>(
    localStorage.getItem(LOCATION_STORAGE_KEY) ?? ''
  );

  readonly token = this._token.asReadonly();
  readonly locationId = this._locationId.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  getToken(): string | null {
    const storedToken = this.readToken();

    if (storedToken !== this._token()) {
      this._token.set(storedToken);
    }

    return storedToken;
  }

    setLocationId(locationId: string): void {
    if (locationId) {
      this.persistLocationId(locationId);
    }
  }

  getLocationId(): string {
    const storedLocationId = localStorage.getItem(LOCATION_STORAGE_KEY) ?? '';

    if (storedLocationId !== this._locationId()) {
      this._locationId.set(storedLocationId);
    }

    return storedLocationId;
  }


  hasValidSession(): boolean {
    return !!this.getToken();
  }

  syncTokenFromStorage(): void {
    const storedToken = this.readToken();

    if (storedToken !== this._token()) {
      this._token.set(storedToken);
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.baseUrl}/userapi/v1/users/login`,
      request
    ).pipe(
      tap(response => {
        const token = response.token || response.accessToken || response.jwt;

        if (!token) {
          throw new Error('La respuesta de autenticación no contiene token.');
        }

        this.persistToken(token);
      }),
      switchMap(response => {
        const responseLocationId = this.extractLocationId(response);
        if (responseLocationId) {
          this.persistLocationId(responseLocationId);
          return of(response);
        }

        return this.synchronizeUserLocation().pipe(
          map(() => response),
          catchError(() => of(response))
        );
      })
    );
  }

  synchronizeUserLocation(): Observable<string> {
    const tokenEmail = this.extractEmailFromToken();
    if (!tokenEmail) {
      return of(this.getLocationId());
    }

    return forkJoin({
      users: this.http.get<UserSummaryResponse[]>(`${this.baseUrl}/userapi/v1/users`, {
        params: { page: '0', size: '100' }
      }),
      locations: this.http.get<LocationOption[]>(`${this.baseUrl}/inventory/api/v1/location`)
    }).pipe(
      map(({ users, locations }) => {
        const currentUser = users.find(user => this.matchesUserEmail(user.email, tokenEmail));
        const locationId = this.resolveLocationId(currentUser, locations);

        if (locationId) {
          this.persistLocationId(locationId);
        }

        return locationId;
      })
    );
  }

  logout(): void {
    this.clearCookie(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    this._token.set(null);
    this._locationId.set('');
  }

  private persistToken(token: string): void {
    this.setCookie(TOKEN_STORAGE_KEY, token);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    this._token.set(token);
  }

  private persistLocationId(locationId: string): void {
    localStorage.setItem(LOCATION_STORAGE_KEY, locationId);
    this._locationId.set(locationId);
  }

  private readToken(): string | null {
    return this.getCookie(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private extractLocationId(response: LoginResponse): string {
    const source = response as LoginResponse & { locationId?: string; user?: { locationId?: string } };
    return (source.locationId || source.user?.locationId || '').trim();
  }

  private extractEmailFromToken(): string {
    const token = this.getToken();
    if (!token) return '';

    const parts = token.split('.');
    if (parts.length < 2) return '';

    try {
      const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded)) as JwtPayload;
      return this.normalize(payload.sub || payload.email || '');
    } catch {
      return '';
    }
  }

  private resolveLocationId(user: UserSummaryResponse | undefined, locations: LocationOption[]): string {
    const raw = (user?.locationId || user?.location || '').trim();
    if (!raw) return '';

    const byId = locations.find(location => location.id === raw);
    if (byId) return byId.id;

    const byName = locations.find(location => this.normalize(location.name) === this.normalize(raw));
    return byName?.id ?? raw;
  }

  private matchesUserEmail(listEmail: string, tokenEmail: string): boolean {
    const a = this.normalize(listEmail);
    const b = this.normalize(tokenEmail);
    if (!a || !b) return false;
    if (a === b) return true;

    const [listLocal, listDomain = ''] = a.split('@');
    const [tokenLocal, tokenDomain = ''] = b.split('@');
    if (!listDomain || !tokenDomain || listDomain !== tokenDomain) {
      return false;
    }

    const firstAsterisk = listLocal.indexOf('*');
    if (firstAsterisk === -1) {
      return false;
    }

    const lastAsterisk = listLocal.lastIndexOf('*');
    const prefix = listLocal.slice(0, firstAsterisk);
    const suffix = listLocal.slice(lastAsterisk + 1);

    if (tokenLocal.length < prefix.length + suffix.length) {
      return false;
    }

    return tokenLocal.startsWith(prefix) && tokenLocal.endsWith(suffix);
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private setCookie(name: string, value: string): void {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${name}=`));

    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null;
  }

  private clearCookie(name: string): void {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }
}
