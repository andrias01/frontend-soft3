import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LocationResponse } from '../../models/location.model';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-list.component.html',
  styleUrl: './location-list.component.css'
})
export class LocationListComponent implements OnInit, OnDestroy {
  locations = signal<LocationResponse[]>([]);
  loading = signal(false);
  filtering = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');
  successMessage = signal('');
  togglingById = signal<Record<string, boolean>>({});

  searchTerm = signal('');
  statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  currentPage = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15];

  private filterTimer: ReturnType<typeof setTimeout> | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  filteredLocations = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let list = this.locations();

    if (term) {
      list = list.filter(location =>
        [location.name, location.city, location.address, location.email, location.phoneNumber]
          .join(' ')
          .toLowerCase()
          .includes(term)
      );
    }

    if (this.statusFilter() === 'ACTIVE') {
      list = list.filter(location => location.active);
    }

    if (this.statusFilter() === 'INACTIVE') {
      list = list.filter(location => !location.active);
    }

    return list;
  });

  totalPages = computed(() => {
    const total = Math.ceil(this.filteredLocations().length / this.pageSize());
    return total > 0 ? total : 1;
  });

  paginatedLocations = computed(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredLocations().slice(start, start + size);
  });

  visibleFrom = computed(() => {
    if (this.filteredLocations().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  visibleTo = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredLocations().length);
  });

  constructor(
    private readonly locationService: LocationService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const navState = this.router.getCurrentNavigation()?.extras?.state ?? history.state;

    if (navState?.successMessage) {
      this.successMessage.set(navState.successMessage);
      this.scheduleSuccessDismiss();
    }

    this.loadLocations(true);

    this.refreshTimer = setInterval(() => {
      this.loadLocations(false);
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    if (this.successTimer) clearTimeout(this.successTimer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  loadLocations(showLoading = true): void {
    if (showLoading) this.loading.set(true);

    this.errorMessage.set('');

    this.locationService.list().subscribe({
      next: data => {
        this.locations.set(this.sortLocations(data ?? []));
        this.keepPageInRange();
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(
          this.extractBackendMessage(error, 'No se pudieron cargar las sedes.')
        );
        this.loading.set(false);
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    this.triggerFiltering();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value as 'ALL' | 'ACTIVE' | 'INACTIVE');
    this.currentPage.set(1);
    this.triggerFiltering();
  }

  onPageSizeChange(value: string | number): void {
    this.pageSize.set(Number(value));
    this.currentPage.set(1);
  }

  goToPreviousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  goToNextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('ALL');
    this.currentPage.set(1);
  }

  goToCreate(): void {
    this.router.navigate(['/inventor/locations/create']);
  }

  goToEdit(location: LocationResponse): void {
    this.router.navigate(['/inventor/locations', location.id, 'edit']);
  }

  toggleStatus(location: LocationResponse): void {
    if (this.togglingById()[location.id]) return;

    this.infoMessage.set('');
    this.successMessage.set('');
    this.errorMessage.set('');
    this.markToggling(location.id, true);

    const nextStatus = !location.active;

    this.locationService.updateStatus(location.id, { active: nextStatus }).subscribe({
      next: () => {
        this.locations.update(list =>
          list.map(item => (item.id === location.id ? { ...item, active: nextStatus } : item))
        );

        this.successMessage.set(`La sede se ${nextStatus ? 'activó' : 'inactivó'} correctamente.`);
        this.scheduleSuccessDismiss();
        this.markToggling(location.id, false);
        this.loadLocations(false);
      },
      error: error => {
        this.errorMessage.set(
          this.extractBackendMessage(
            error,
            `No se pudo ${location.active ? 'inactivar' : 'activar'} la sede.`
          )
        );
        this.markToggling(location.id, false);
      }
    });
  }

  isToggling(id: string): boolean {
    return !!this.togglingById()[id];
  }

  private markToggling(id: string, value: boolean): void {
    this.togglingById.update(state => ({
      ...state,
      [id]: value
    }));
  }

  private triggerFiltering(): void {
    this.filtering.set(true);

    if (this.filterTimer) clearTimeout(this.filterTimer);

    this.filterTimer = setTimeout(() => {
      this.filtering.set(false);
    }, 250);
  }

  private scheduleSuccessDismiss(): void {
    if (this.successTimer) clearTimeout(this.successTimer);

    this.successTimer = setTimeout(() => {
      this.successMessage.set('');
    }, 3500);
  }

  private keepPageInRange(): void {
    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }

  private sortLocations(locations: LocationResponse[]): LocationResponse[] {
    return [...locations].sort((a, b) => {
      const dateA = this.getLocationDate(a);
      const dateB = this.getLocationDate(b);

      if (dateA !== null && dateB !== null) {
        return dateB - dateA;
      }

      return 0;
    });
  }

  private getLocationDate(location: LocationResponse): number | null {
    const value =
      (location as any).createdAt ??
      (location as any).creationDate ??
      (location as any).updatedAt ??
      (location as any).dateCreated;

    if (!value) return null;

    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }

  private extractBackendMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }
    if (typeof error?.error?.detail === 'string' && error.error.detail.trim()) {
      return error.error.detail;
    }

    const validationErrors = error?.error?.errors;

    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      return validationErrors.join(' · ');
    }

    if (validationErrors && typeof validationErrors === 'object') {
      return Object.values(validationErrors).flat().join(' · ');
    }

    return fallback;
  }
}