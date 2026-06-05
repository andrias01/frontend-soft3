import { Injectable } from '@angular/core';
import { ENV } from '@config/env.config';
import { LOCATION_STORAGE_KEY } from '@features/user/services/auth.service';

@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  readonly apiUrl = ENV.apiUrl;
  get locationId(): string {
    return localStorage.getItem(LOCATION_STORAGE_KEY) ?? '';
  }
}
