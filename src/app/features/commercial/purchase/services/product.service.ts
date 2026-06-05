import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';

export interface ProductDTO {
  id: string;
  name: string;
  salePrice: number;
  stock: number;
  locationId: string;
}

export interface ProductPage {
  content: ProductDTO[];
  totalElements: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {

  private url = 'http://localhost:8080/inventory/product';

  constructor(private http: HttpClient) {}

  getByLocation(locationId: string): Observable<ProductPage> {
    return this.http.get<ProductPage>(
      `${this.url}/location/${locationId}?page=0&size=100`
    );
  }
}