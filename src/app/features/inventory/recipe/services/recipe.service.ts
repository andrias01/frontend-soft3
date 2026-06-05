import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from '@config/env.config';
import { RecipeRequest, RecipeResponse } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly url = `${ENV.apiUrl}/recipes`;

  constructor(private http: HttpClient) {}

  list(): Observable<RecipeResponse[]> {
    return this.http.get<RecipeResponse[]>(this.url);
  }

  getById(id: string): Observable<RecipeResponse> {
    return this.http.get<RecipeResponse>(`${this.url}/${id}`);
  }

  getByName(name: string): Observable<RecipeResponse> {
    return this.http.get<RecipeResponse>(`${this.url}`, { params: { name } });
  }

  create(request: RecipeRequest): Observable<void> {
    return this.http.post<void>(this.url, request);
  }

  update(request: RecipeRequest): Observable<void> {
    return this.http.put<void>(this.url, request);
  }

  deactivate(name: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/${encodeURIComponent(name)}`, {});
  }
}
