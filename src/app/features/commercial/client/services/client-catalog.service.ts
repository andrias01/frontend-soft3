import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { CatalogOption, CityOption } from '@commercial/client/models/client.model';
import { ENV } from '@config/env.config';

interface DocumentTypeApi {
  id: string;
  code: string;
  name: string;
}

interface DepartmentApi {
  id: string;
  name: string;
}

interface CityApi {
  id: string;
  departmentId: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ClientCatalogService {
  private readonly http = inject(HttpClient);
  private readonly catalogUrl = `${ENV.apiUrl.replace(/\/api\/v1\/?$/, '')}/userapi/v1`;

  getDocumentTypes(): Observable<CatalogOption[]> {
    return this.http.get<DocumentTypeApi[]>(`${this.catalogUrl}/document-types`).pipe(
      map((types) =>
        types.map((type) => ({
          id: String(type.id),
          label: type.name,
          shortLabel: type.code,
        })),
      ),
      catchError(() => of([])),
    );
  }

  getDepartments(): Observable<CatalogOption[]> {
    return this.http.get<DepartmentApi[]>(`${this.catalogUrl}/departments`).pipe(
      map((departments) =>
        departments.map((department) => ({
          id: String(department.id),
          label: department.name,
        })),
      ),
      catchError(() => of([])),
    );
  }

  getCities(departmentId?: string): Observable<CityOption[]> {
    let params = new HttpParams();
    if (departmentId) {
      params = params.set('departmentId', departmentId);
    }

    return this.http.get<CityApi[]>(`${this.catalogUrl}/cities`, { params }).pipe(
      map((cities) =>
        cities.map((city) => ({
          id: String(city.id),
          label: city.name,
          departmentId: String(city.departmentId),
        })),
      ),
      catchError(() => of([])),
    );
  }
}
