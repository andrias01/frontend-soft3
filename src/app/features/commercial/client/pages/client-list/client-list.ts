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
import { filter, finalize, forkJoin } from 'rxjs';

import { Client, ClientStatus } from '@commercial/client/models/client.model';
import { ClientCatalogService } from '@commercial/client/services/client-catalog.service';
import {
  ClientService,
  getClientErrorMessage,
} from '@commercial/client/services/client.service';

type StatusFilter = 'ALL' | ClientStatus;
type ClientToastType = 'success' | 'error';

interface ClientToast {
  type: ClientToastType;
  message: string;
}

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-list.html',
  styleUrl: './client-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientList implements OnInit, OnDestroy {
  private readonly clientService = inject(ClientService);
  private readonly catalogService = inject(ClientCatalogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly documentTypeLabels = signal<Map<string, string>>(new Map());
  private readonly cityLabels = signal<Map<string, string>>(new Map());

  protected readonly clients = signal<Client[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('ALL');
  protected readonly changingStatus = signal<string | null>(null);
  protected readonly toast = signal<ClientToast | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 8;

  protected readonly totalClients = computed(() => this.clients().length);
  protected readonly activeClients = computed(
    () => this.clients().filter((client) => this.statusOf(client) === 'ACTIVE').length,
  );
  protected readonly inactiveClients = computed(
    () => this.clients().filter((client) => this.statusOf(client) === 'INACTIVE').length,
  );

  protected readonly filteredClients = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.clients();
    }

    return this.clients().filter((client) =>
      [
        this.fullName(client),
        client.email,
        client.phone,
        client.documentNumber,
        this.documentTypeLabel(client.documentTypeId),
        this.cityLabel(client.cityId),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredClients().length / this.pageSize)),
  );

  protected readonly paginatedClients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredClients().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadCatalogLookups();
    this.loadClients();

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
        filter((event) => event.urlAfterRedirects === '/commercial/clients'),
      )
      .subscribe(() => this.loadClients({ showLoading: false }));
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
    this.loadClients();
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  protected toggleStatus(client: Client): void {
    if (!client.id || this.changingStatus()) {
      return;
    }

    const nextStatus: ClientStatus = this.statusOf(client) === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextStatus === 'INACTIVE' ? 'desactivar' : 'activar';

    if (nextStatus === 'INACTIVE' && !confirm(`Deseas desactivar al cliente "${this.fullName(client)}"?`)) {
      return;
    }

    this.changingStatus.set(client.id);
    this.error.set('');

    this.clientService
      .updateStatus(client.id, nextStatus)
      .pipe(finalize(() => this.changingStatus.set(null)))
      .subscribe({
        next: () => {
          this.showToast(
            'success',
            `Solicitud enviada correctamente. El cliente se ${actionLabel === 'desactivar' ? 'desactivara' : 'activara'} en breve.`,
          );
          this.loadClients({ showLoading: false });
        },
        error: (err) => {
          const message = getClientErrorMessage(err);
          this.error.set(message);
          this.showToast('error', message);
        },
      });
  }

  protected clearToast(): void {
    this.clearToastTimer();
    this.toast.set(null);
  }

  protected statusOf(client: Client): ClientStatus {
    return client.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  protected documentTypeLabel(documentTypeId: string): string {
    const label = this.documentTypeLabels().get(documentTypeId);
    return label ?? 'Documento';
  }

  protected cityLabel(cityId: string): string {
    const label = this.cityLabels().get(cityId);
    return label ?? 'Ciudad';
  }

  protected fullName(client: Client): string {
    const firstName = (client.firstName ?? '').trim();
    const secondName = (client.secondName ?? '').trim();
    const includeSecondName =
      !!secondName && secondName.localeCompare(firstName, undefined, { sensitivity: 'accent' }) !== 0;

    return [
      firstName,
      includeSecondName ? secondName : '',
      client.firstLastName,
      client.secondLastName,
    ]
      .map((part) => (part ?? '').trim())
      .filter(Boolean)
      .join(' ')
      .trim() || 'Sin nombre';
  }

  private loadCatalogLookups(): void {
    forkJoin({
      documentTypes: this.catalogService.getDocumentTypes(),
      cities: this.catalogService.getCities(),
    }).subscribe({
      next: ({ documentTypes, cities }) => {
        this.documentTypeLabels.set(
          new Map(
            documentTypes.map((type) => [
              type.id,
              type.shortLabel ? `${type.shortLabel} · ${type.label}` : type.label,
            ]),
          ),
        );
        this.cityLabels.set(new Map(cities.map((city) => [city.id, city.label])));
      },
      error: () => {
        this.documentTypeLabels.set(new Map());
        this.cityLabels.set(new Map());
      },
    });
  }

  private loadClients(options: { showLoading?: boolean } = {}): void {
    const showLoading = options.showLoading ?? true;
    const filterValue = this.statusFilter();
    const active = filterValue === 'ALL' ? undefined : filterValue === 'ACTIVE';

    if (showLoading) {
      this.loading.set(true);
    }

    this.error.set('');

    this.clientService
      .getClients({ active })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (clients) => {
          this.clients.set(clients);
          const maxPage = Math.max(1, Math.ceil(this.filteredClients().length / this.pageSize));
          if (this.currentPage() > maxPage) {
            this.currentPage.set(maxPage);
          }
        },
        error: (err) => {
          this.clients.set([]);
          const message = getClientErrorMessage(err);
          this.error.set(message);
          this.showToast('error', message);
        },
      });
  }

  private showToast(type: ClientToastType, message: string): void {
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
