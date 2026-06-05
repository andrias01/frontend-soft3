import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, finalize } from 'rxjs';

import { ProviderStatusBadgeComponent } from '@commercial/provider/components/provider-status-badge/provider-status-badge.component';
import {
  CatalogOption,
  CityOption,
  Provider,
  ProviderStatus,
} from '@commercial/provider/models/provider.model';
import { ProviderFilterPipe } from '@commercial/provider/pipes/provider-filter.pipe';
import {
  ProvidersService,
  getProviderErrorMessage,
} from '@commercial/provider/services/provider.service';

type StatusFilter = 'ALL' | ProviderStatus;
type ProviderToastType = 'success' | 'error';

interface ProviderToast {
  type: ProviderToastType;
  message: string;
}

@Component({
  selector: 'app-provider-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ProviderStatusBadgeComponent],
  templateUrl: './provider-list.component.html',
  styleUrl: './provider-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderListComponent implements OnInit, OnDestroy {
  private readonly providerService = inject(ProvidersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly filterPipe = new ProviderFilterPipe();

  protected readonly documentTypes: CatalogOption[] = [
    { id: 1, label: 'NIT', shortLabel: 'NIT' },
    { id: 2, label: 'Cédula de ciudadanía', shortLabel: 'CC' },
    { id: 3, label: 'Cédula de extranjería', shortLabel: 'CE' },
    { id: 4, label: 'Pasaporte', shortLabel: 'PP' },
  ];

  protected readonly taxRegimes: CatalogOption[] = [
    { id: 1, label: 'Régimen común' },
    { id: 2, label: 'Régimen simplificado' },
    { id: 3, label: 'No responsable de IVA' },
  ];

  protected readonly departments: CatalogOption[] = [
    { id: 11, label: 'Bogotá D.C.' },
    { id: 5, label: 'Antioquia' },
    { id: 76, label: 'Valle del Cauca' },
    { id: 8, label: 'Atlántico' },
  ];

  protected readonly cities: CityOption[] = [
    { id: 11001, label: 'Bogotá', departmentId: 11 },
    { id: 5001, label: 'Medellín', departmentId: 5 },
    { id: 76001, label: 'Cali', departmentId: 76 },
    { id: 8001, label: 'Barranquilla', departmentId: 8 },
  ];

  protected readonly providers = signal<Provider[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly changingStatus = signal<string | null>(null);
  protected readonly toast = signal<ProviderToast | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 8;

  protected readonly totalProviders = computed(() => this.providers().length);
  protected readonly activeProviders = computed(
    () => this.providers().filter((p) => this.statusOf(p) === 'ACTIVE').length,
  );
  protected readonly inactiveProviders = computed(
    () => this.providers().filter((p) => this.statusOf(p) === 'INACTIVE').length,
  );

  protected readonly filteredProviders = computed(() =>
    this.filterPipe.transform(this.providers(), this.search()),
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProviders().length / this.pageSize)),
  );

  protected readonly paginatedProviders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredProviders().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadProviders();

    this.route.queryParamMap.subscribe((params) => {
      if (params.get('refreshed') === '1') {
        this.showToast('success', 'Solicitud enviada correctamente');
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
      }
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        filter((event) => event.urlAfterRedirects === '/commercial/provider'),
      )
      .subscribe(() => this.loadProviders({ showLoading: false }));
  }

  ngOnDestroy(): void {
    this.clearToastTimer();
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected setStatusFilter(filterValue: StatusFilter): void {
    this.statusFilter.set(filterValue);
    this.currentPage.set(1);
    this.loadProviders();
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  protected toggleStatus(provider: Provider): void {
    if (!provider.id || this.changingStatus()) {
      return;
    }

    const nextStatus: ProviderStatus = this.statusOf(provider) === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextStatus === 'INACTIVE' ? 'desactivar' : 'activar';

    if (
      nextStatus === 'INACTIVE' &&
      !confirm(`¿Deseas desactivar al proveedor "${provider.businessName}"?`)
    ) {
      return;
    }

    this.changingStatus.set(provider.id);
    this.error.set('');

    this.providerService
      .updateStatus(provider.id, nextStatus)
      .pipe(finalize(() => this.changingStatus.set(null)))
      .subscribe({
        next: () => {
          this.showToast(
            'success',
            `Solicitud enviada correctamente. El proveedor se ${actionLabel === 'desactivar' ? 'desactivará' : 'activará'} en breve.`,
          );
          this.loadProviders({ showLoading: false });
        },
        error: (err) => {
          const message = getProviderErrorMessage(err);
          this.error.set(message);
          this.showToast('error', message);
        },
      });
  }

  protected clearToast(): void {
    this.clearToastTimer();
    this.toast.set(null);
  }

  protected statusOf(provider: Provider): ProviderStatus {
    return provider.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  protected responsibleName(provider: Provider): string {
    return `${provider.responsibleFirstName ?? ''} ${provider.responsibleLastName ?? ''}`.trim() || '—';
  }

  protected documentTypeShortLabel(documentTypeId: number): string {
    return this.documentTypes.find((t) => t.id === documentTypeId)?.shortLabel ?? 'DOC';
  }

  protected taxRegimeLabel(taxRegimeId: number): string {
    return this.taxRegimes.find((t) => t.id === taxRegimeId)?.label ?? '—';
  }

  protected locationLabel(provider: Provider): string {
    const dept = this.departments.find((d) => d.id === provider.departmentId)?.label;
    const city = this.cities.find((c) => c.id === provider.cityId)?.label;
    if (city && dept) {
      return `${city}, ${dept}`;
    }
    return provider.address || '—';
  }

  private loadProviders(options: { showLoading?: boolean } = {}): void {
    const showLoading = options.showLoading ?? true;
    const filterValue = this.statusFilter();
    const status = filterValue === 'ALL' ? undefined : filterValue;

    if (showLoading) {
      this.loading.set(true);
    }

    this.error.set('');

    this.providerService
      .getProviders(status)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (providers) => {
          this.providers.set(providers);
          const maxPage = Math.max(1, Math.ceil(this.filteredProviders().length / this.pageSize));
          if (this.currentPage() > maxPage) {
            this.currentPage.set(maxPage);
          }
        },
        error: (err) => {
          this.providers.set([]);
          const message = getProviderErrorMessage(err);
          this.error.set(message);
          this.showToast('error', message);
        },
      });
  }

  private showToast(type: ProviderToastType, message: string): void {
    this.clearToastTimer();
    this.toast.set({ type, message });
    this.toastTimeoutId = window.setTimeout(() => this.toast.set(null), 4200);
  }

  private clearToastTimer(): void {
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  private toastTimeoutId: number | null = null;
}
