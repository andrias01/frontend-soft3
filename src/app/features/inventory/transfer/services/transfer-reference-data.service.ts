import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ENV } from '@config/env.config';
import { LocationService } from '@features/inventory/location/services/location.service';
import { LocationResponse } from '@features/inventory/location/models/location.model';
import { ProductResponse } from '@features/inventory/product/models/product.model';
import { UserSummaryResponse } from '@features/user/models/user-profile.model';

interface PageResponse<T> {
  content?: T[];
  totalPages?: number;
}

@Injectable({ providedIn: 'root' })
export class TransferReferenceDataService {
  private readonly http = inject(HttpClient);
  private readonly locationService = inject(LocationService);
  private readonly userApiRoot = ENV.apiUrl.replace('/api/v1', '');
  private readonly inventoryApiRoot = ENV.apiUrl.replace('/api/v1', '');

  async loadResponsables(pageSize = 100): Promise<UserSummaryResponse[]> {
    const users: UserSummaryResponse[] = [];

    for (let page = 0; page < 30; page++) {
      const pageUsers = await firstValueFrom(
        this.http.get<UserSummaryResponse[]>(
          `${this.userApiRoot}/userapi/v1/users`,
          { params: { page: String(page), size: String(pageSize) } }
        )
      );

      users.push(...pageUsers);

      if (pageUsers.length < pageSize) {
        break;
      }
    }

    return users;
  }

  async loadProductsByLocation(locationId: string, pageSize = 100): Promise<ProductResponse[]> {
    if (!locationId) {
      return [];
    }

    const products: ProductResponse[] = [];

    for (let page = 0; page < 30; page++) {
      const response = await firstValueFrom(
        this.http.get<PageResponse<ProductResponse>>(
          `${this.inventoryApiRoot}/inventory/product/location/${locationId}`,
          { params: { page: String(page), size: String(pageSize) } }
        )
      );

      const pageProducts = response?.content ?? [];

      products.push(...pageProducts);

      const totalPages = response?.totalPages;
      const lastPageReached = typeof totalPages === 'number'
        ? page + 1 >= totalPages
        : (response?.content?.length ?? 0) < pageSize;

      if (lastPageReached) {
        break;
      }
    }

    return products;
  }

  async loadSelectableLocations(): Promise<LocationResponse[]> {
    try {
      const locations = await firstValueFrom(this.locationService.list());
      return locations.length > 0 ? locations : await firstValueFrom(this.locationService.listActive());
    } catch {
      return [];
    }
  }
}
