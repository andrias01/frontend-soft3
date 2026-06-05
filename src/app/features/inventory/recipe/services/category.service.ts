import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CategoryDTO {
  id: string;
  name: string;
  type: string;
  subtype: string;
  status: 'ACTIVE' | 'INACTIVE';
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly url = `/inventory/api/v1/categories`;

  constructor(private http: HttpClient) {}

  getActive(): Observable<CategoryDTO[]> {
    return this.http.get<CategoryDTO[]>(this.url, { params: { status: 'ACTIVE' } });
  }
}
