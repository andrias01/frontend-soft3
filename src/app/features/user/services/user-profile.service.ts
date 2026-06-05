import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';
import {
  CityOption,
  DepartmentOption,
  DocumentTypeOption,
  JwtPayload,
  LocationOption,
  UpdateUserPayload,
  UserDetailResponse,
  UserEditModel,
  UserProfileData,
  UserSummaryResponse
} from '@features/user/models/user-profile.model';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiRoot = ENV.apiUrl.replace('/api/v1', '');

  async loadProfileData(): Promise<UserProfileData> {
    const tokenEmail = this.extractEmailFromToken();
    if (!tokenEmail) {
      throw new Error('No se pudo leer el correo del token.');
    }

    const summary = await this.findCurrentUserSummary(tokenEmail);
    if (!summary) {
      throw new Error('No se encontro el usuario autenticado en el listado.');
    }

    const detail = await firstValueFrom(this.http.get<UserDetailResponse>(
      `${this.apiRoot}/userapi/v1/users/${summary.id}`
    ));

    const [docTypesResult, depsResult, locationsResult] = await Promise.allSettled([
      firstValueFrom(this.http.get<DocumentTypeOption[]>(`${this.apiRoot}/userapi/v1/document-types`)),
      firstValueFrom(this.http.get<DepartmentOption[]>(`${this.apiRoot}/userapi/v1/departments`)),
      firstValueFrom(this.http.get<LocationOption[]>(`${this.apiRoot}/inventory/api/v1/location/active`))
    ]);

    const documentTypes = docTypesResult.status === 'fulfilled' ? docTypesResult.value : [];
    const departments = depsResult.status === 'fulfilled' ? depsResult.value : [];
    const locations = locationsResult.status === 'fulfilled' ? locationsResult.value : [];

    const documentTypeId = this.findDocumentTypeIdByName(detail.documentType, documentTypes);
    const departmentId = this.findDepartmentIdByName(detail.department, departments);
    const cities = await this.loadCities(departmentId);

    const cityId = this.findCityIdByName(detail.city, cities);
    const locationId = this.resolveLocationId(detail.location, summary.location, locations);
    this.authService.setLocationId(locationId);

    const editable: UserEditModel = {
      firstName: detail.firstName ?? summary.firstName ?? '',
      lastName: detail.lastName ?? summary.lastName ?? '',
      documentTypeId,
      documentNumber: detail.documentNumber ?? summary.documentNumber ?? '',
      phone: detail.phone ?? summary.phone ?? '',
      email: detail.email ?? summary.email ?? tokenEmail,
      birthDate: detail.birthDate ?? '',
      departmentId,
      cityId,
      address: detail.address ?? '',
      locationId
    };

    return {
      userId: summary.id,
      editable,
      documentTypes,
      departments,
      cities,
      locations
    };
  }

  async updateProfile(userId: string, payload: UpdateUserPayload): Promise<void> {
    await firstValueFrom(this.http.put<UserDetailResponse>(
      `${this.apiRoot}/userapi/v1/users/${userId}`,
      payload
    ));
  }

  async loadCities(departmentId: string): Promise<CityOption[]> {
    if (!departmentId) {
      return [];
    }

    try {
      return await firstValueFrom(this.http.get<CityOption[]>(
        `${this.apiRoot}/userapi/v1/cities`,
        { params: { departmentId } }
      ));
    } catch {
      return [];
    }
  }

  getBackendErrorMessage(error: unknown): string {
    const asAny = error as {
      error?: { message?: string };
      message?: string;
    };

    if (asAny?.error?.message?.trim()) {
      return asAny.error.message;
    }

    if (asAny?.message?.trim()) {
      return asAny.message;
    }

    return '';
  }

  private async findCurrentUserSummary(tokenEmail: string): Promise<UserSummaryResponse | null> {
    const pageSize = 100;

    for (let page = 0; page < 30; page++) {
      const users = await firstValueFrom(this.http.get<UserSummaryResponse[]>(
        `${this.apiRoot}/userapi/v1/users`,
        { params: { page: String(page), size: String(pageSize) } }
      ));

      const current = users.find(user => this.matchesUserEmail(user.email, tokenEmail));
      if (current) {
        return current;
      }

      if (users.length < pageSize) {
        break;
      }
    }

    return null;
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

  private extractEmailFromToken(): string {
    const token = this.authService.token();
    if (!token) return '';

    const parts = token.split('.');
    if (parts.length < 2) return '';

    try {
      const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded)) as JwtPayload;
      const fromSub = typeof payload.sub === 'string' ? payload.sub : '';
      const fromEmail = typeof payload.email === 'string' ? payload.email : '';
      return this.normalize(fromSub || fromEmail);
    } catch {
      return '';
    }
  }

  private findDocumentTypeIdByName(name: string | null | undefined, options: DocumentTypeOption[]): string {
    const match = options.find(option => this.normalize(option.name) === this.normalize(name));
    return match?.id ?? options[0]?.id ?? '';
  }

  private findDepartmentIdByName(name: string | null | undefined, options: DepartmentOption[]): string {
    const match = options.find(option => this.normalize(option.name) === this.normalize(name));
    return match?.id ?? options[0]?.id ?? '';
  }

  private findCityIdByName(name: string | null | undefined, options: CityOption[]): string {
    const match = options.find(option => this.normalize(option.name) === this.normalize(name));
    return match?.id ?? options[0]?.id ?? '';
  }

  private resolveLocationId(
    detailLocation: string | null | undefined,
    summaryLocation: string | null | undefined,
    options: LocationOption[]
  ): string {
    const raw = (summaryLocation ?? detailLocation ?? '').trim();
    const byId = options.find(option => option.id === raw);
    if (byId) return byId.id;

    const byName = options.find(option => this.normalize(option.name) === this.normalize(detailLocation));
    if (byName) return byName.id;

    return raw || options[0]?.id || '';
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }
}
