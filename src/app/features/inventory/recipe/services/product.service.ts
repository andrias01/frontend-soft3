import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';

export interface RecipeProductOption {
  id: string;
  name: string;
  salePrice: number;
}

interface ProductPage {
  content: RecipeProductOption[];
}

@Injectable({ providedIn: 'root' })
export class RecipeProductService {
  private readonly apiRoot = ENV.apiUrl.replace(/\/api\/v1\/?$/, '');
  private readonly url = `${this.apiRoot}/inventory/api/v1/product`;

  constructor(private http: HttpClient) {}

  getByLocation(locationId: string): Observable<ProductPage> {
    return this.http.get<ProductPage>(
      `${this.url}/location/${locationId}?page=0&size=100`
    );
  }
}
