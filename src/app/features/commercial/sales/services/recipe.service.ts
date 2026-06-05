import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { EnvironmentService } from '../../../../core/services/environment.service';
import { RecipeResponse } from '../models/sales.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  constructor(private readonly http: HttpClient, private readonly env: EnvironmentService) {}

  getRecipes(): Observable<RecipeResponse[]> {
    return this.http.get<unknown>(`${this.env.apiUrl}/recipes`).pipe(
      map((value) => Array.isArray(value) ? value : ((value as any)?.content ?? (value as any)?.data ?? []))
    );
  }
}
