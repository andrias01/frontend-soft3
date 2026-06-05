import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ENV } from '@config/env.config';
import {
  CityOption,
  DepartmentOption,
  DocumentTypeOption,
  LocationOption,
  RegisterUserPayload
} from '@features/user/models/user-profile.model';

interface RegisterCatalogs {
  documentTypes: DocumentTypeOption[];
  departments: DepartmentOption[];
  locations: LocationOption[];
}

type LocationCatalogItem = LocationOption & { active?: boolean | string | number };
type LocationCatalogResponse =
  | LocationCatalogItem[]
  | {
      content?: LocationCatalogItem[];
      data?: LocationCatalogItem[];
      locations?: LocationCatalogItem[];
      items?: LocationCatalogItem[];
    };

@Injectable({ providedIn: 'root' })
export class UserRegisterService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = '';

  async loadCatalogs(): Promise<RegisterCatalogs> {
    const [docTypesResult, depsResult, locationsResult] = await Promise.allSettled([
      firstValueFrom(this.http.get<DocumentTypeOption[]>(`${this.apiRoot}/userapi/v1/document-types`)),
      firstValueFrom(this.http.get<DepartmentOption[]>(`${this.apiRoot}/userapi/v1/departments`)),
      this.loadLocations()
    ]);

    return {
      documentTypes: docTypesResult.status === 'fulfilled' ? docTypesResult.value : [],
      departments: depsResult.status === 'fulfilled' ? depsResult.value : [],
      locations: locationsResult.status === 'fulfilled'
        ? this.onlyActiveLocations(locationsResult.value)
        : []
    };
  }

private async loadLocations(): Promise<LocationOption[]> {
  const fromActive = await this.fetchLocations(
    `${this.apiRoot}/inventory/api/v1/location/active`
  );
  if (fromActive.length > 0) {
    return fromActive;
  }
  return this.fetchLocations(`${this.apiRoot}/inventory/api/v1/location`);
}

private async fetchLocations(url: string): Promise<LocationOption[]> {
  try {
    const response = await firstValueFrom(this.http.get<LocationCatalogResponse>(url));
    console.log('>>> fetchLocations raw response para', url, response);
    const result = this.onlyActiveLocations(response);
    console.log('>>> onlyActiveLocations result:', result);
    return result;
  } catch (error) {
    console.error('>>> fetchLocations error para URL:', url, error);
    return [];
  }
}

  private onlyActiveLocations(response: LocationCatalogResponse): LocationOption[] {
    const locations = this.extractLocationItems(response);

    return locations
      .filter(location => this.isActiveLocation(location))
      .filter(location => !!location.id && !!location.name)
      .map(location => ({
        id: location.id,
        name: location.name
      }));
  }

  private extractLocationItems(response: LocationCatalogResponse): LocationCatalogItem[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.content ?? response.data ?? response.locations ?? response.items ?? [];
  }

  private isActiveLocation(location: LocationCatalogItem): boolean {
    if (location.active === undefined || location.active === null) {
      return true;
    }

    if (typeof location.active === 'string') {
      return location.active.trim().toLowerCase() === 'true';
    }

    return Boolean(location.active);
  }


  async loadCities(departmentId: string): Promise<CityOption[]> {
    if (!departmentId) return [];

    try {
      return await firstValueFrom(this.http.get<CityOption[]>(
        `${this.apiRoot}/userapi/v1/cities`,
        { params: { departmentId } }
      ));
    } catch {
      return [];
    }
  }

  async registerUser(payload: RegisterUserPayload): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiRoot}/userapi/v1/users`, payload));
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
}
