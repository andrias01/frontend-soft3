import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private readonly url = 'http://localhost:8080/inventory/product';

  constructor(private http: HttpClient) {}

  getByLocation(locationId: string): Observable<ProductPage> {
    return this.http.get<ProductPage>(
      `${this.url}/location/${locationId}?page=0&size=100`
    );
  }
}
