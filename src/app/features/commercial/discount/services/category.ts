import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';

export interface DiscountCategory {
  id: string;
  name: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly url  = '/inventory/api/v1/categories/type/descuento';

  getAll(): Observable<DiscountCategory[]> {
    return this.http.get<DiscountCategory[]>(this.url);
  }
}