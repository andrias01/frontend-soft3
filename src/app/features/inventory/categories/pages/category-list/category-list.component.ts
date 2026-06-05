import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { LocationResponse } from '../../../location/models/location.model';
import { LocationService } from '../../../location/services/location.service';
import {
  CategoryListFilter,
  CategoryResponse,
  CategoryStatus,
  CreateCategoryRequest
} from '../../models/category.model';
import { CategoryService } from '../../services/category.service';

type SearchMode = 'name' | 'type' | 'subtype';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <h1 class="page-title">Categorias</h1>
          <p class="page-subtitle">Gestion y visualizacion de categorias de inventario.</p>
        </div>
        <button class="btn-primary" type="button" (click)="toggleCreateForm()">
          {{ isCreating() ? 'Cancelar' : '+ Nueva Categoria' }}
        </button>
      </div>

      @if (isCreating()) {
        <div class="form-card">
          <h2>Crear Categoria</h2>
          <div class="form-grid">
            <div class="field-group">
              <label for="name">Nombre</label>
              <input
                id="name"
                class="input"
                [(ngModel)]="newCategory.name"
                placeholder="Ej: Bebidas" />
            </div>
            <div class="field-group">
              <label for="type">Tipo</label>
              <input
                id="type"
                class="input"
                [(ngModel)]="newCategory.type"
                placeholder="Ej: INVENTORY" />
            </div>
            <div class="field-group">
              <label for="subtype">Subtipo</label>
              <input
                id="subtype"
                class="input"
                [(ngModel)]="newCategory.subtype"
                placeholder="Ej: PRODUCTS" />
            </div>
            <div class="field-group">
              <label for="locationId">Sede</label>
              <select
                id="locationId"
                class="select"
                [(ngModel)]="selectedLocationId">
                <option value="">Seleccione una sede</option>
                @for (location of locations(); track location.id) {
                  <option [value]="location.id">{{ location.name }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button
              class="btn-primary"
              type="button"
              [disabled]="isSaving() || !canSave()"
              (click)="saveCategory()">
              {{ isSaving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      }

      <div class="filter-card">
        <div class="filter-bar">
          @for (option of filters; track option.value) {
            <button
              type="button"
              class="filter-chip"
              [class.active]="selectedFilter() === option.value && !searchTerm.trim()"
              [disabled]="isLoading()"
              (click)="loadCategories(option.value)">
              {{ option.label }}
            </button>
          }
        </div>

        <div class="search-row">
          <select class="select" [(ngModel)]="searchMode">
            <option value="name">Nombre</option>
            <option value="type">Tipo</option>
            <option value="subtype">Subtipo</option>
          </select>
          <input
            class="input search-input"
            [(ngModel)]="searchTerm"
            placeholder="Buscar categorias..." />
          <button
            class="btn-secondary"
            type="button"
            [disabled]="isLoading() || !searchTerm.trim()"
            (click)="searchCategories()">
            Buscar
          </button>
          <button
            class="btn-ghost"
            type="button"
            [disabled]="isLoading()"
            (click)="clearSearch()">
            Limpiar
          </button>
        </div>
      </div>

      @if (bannerMessage()) {
        <div class="alert-success">{{ bannerMessage() }}</div>
      }

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (isLoading()) {
        <div class="loading-container">
          <div class="spinner"></div>
          <p>Cargando categorias...</p>
        </div>
      }

      @if (!isLoading() && !error()) {
        @if (categories().length === 0) {
          <div class="empty-state">
            <p>No hay categorias registradas para esta consulta.</p>
          </div>
        } @else {
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>CNS</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Subtipo</th>
                  <th>Sede</th>
                  <th>Fecha ingreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (category of categories(); track category.id) {
                  <tr>
                    <td class="mono">#{{ category.cns }}</td>
                    <td class="strong">{{ category.name }}</td>
                    <td>{{ category.type }}</td>
                    <td>{{ category.subtype }}</td>
                    <td>{{ locationName(category.locationId) }}</td>
                    <td>{{ category.entryDate | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td>
                      <span [class]="'badge badge-' + category.status.toLowerCase()">
                        {{ category.status }}
                      </span>
                    </td>
                    <td>
                      <button
                        class="btn-secondary"
                        type="button"
                        [disabled]="processingId() === category.id"
                        (click)="toggleStatus(category)">
                        {{ statusButtonLabel(category) }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; color: #0f172a; }
    .page-shell { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-secondary);
      margin: 0 0 0.25rem 0;
    }
    .page-subtitle { color: #64748b; margin: 0; font-size: 0.9375rem; }
    .btn-primary, .btn-secondary, .btn-ghost {
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s, opacity 0.2s;
      white-space: nowrap;
    }
    .btn-primary {
      background: var(--color-primary);
      color: white;
      padding: 0.6rem 1.25rem;
      border: none;
    }
    .btn-secondary {
      background: white;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      padding: 0.5rem 0.9rem;
    }
    .btn-ghost {
      background: transparent;
      border: 1px solid transparent;
      color: #64748b;
      padding: 0.5rem 0.75rem;
    }
    .btn-primary:hover, .btn-secondary:hover, .btn-ghost:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-card, .filter-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }
    .form-card h2 {
      font-size: 1.25rem;
      margin: 0 0 1rem 0;
      color: var(--color-secondary);
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
    .field-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .field-group label { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .input, .select {
      padding: 0.55rem 0.65rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      background: white;
      color: #111827;
    }
    .form-actions { margin-top: 1rem; }
    .filter-card { display: flex; flex-direction: column; gap: 1rem; }
    .filter-bar, .search-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
    .filter-chip {
      border: 1px solid #cbd5e1;
      background: white;
      border-radius: 999px;
      padding: 0.55rem 1rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .filter-chip.active {
      background: var(--color-secondary);
      border-color: var(--color-secondary);
      color: white;
    }
    .search-input { min-width: 240px; flex: 1; }
    .alert-success, .alert-error {
      padding: 1rem 1.25rem;
      border-radius: 0.5rem;
    }
    .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 0;
      color: #64748b;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state {
      text-align: center;
      padding: 4rem 0;
      color: #64748b;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }
    .table-wrapper {
      background: white;
      border-radius: 0.75rem;
      border: 1px solid #e2e8f0;
      overflow: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      min-width: 900px;
    }
    .data-table thead { background: #f8fafc; }
    .data-table th {
      padding: 0.875rem 1rem;
      text-align: left;
      font-weight: 600;
      color: #64748b;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 0.875rem 1rem;
      color: #1e293b;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: #f8fafc; }
    .strong { font-weight: 600; }
    .mono { font-family: monospace; color: #475569; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-active { background: #dcfce7; color: #16a34a; }
    .badge-inactive { background: #fee2e2; color: #dc2626; }
    @media (max-width: 900px) {
      .page-header { flex-direction: column; }
      .form-grid { grid-template-columns: 1fr; }
      .search-row { align-items: stretch; }
      .search-row > * { width: 100%; }
    }
  `]
})
export class CategoryListComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly locationService = inject(LocationService);

  protected readonly filters: Array<{ label: string; value: CategoryListFilter }> = [
    { label: 'Todas', value: 'TODOS' },
    { label: 'Activas', value: 'ACTIVE' },
    { label: 'Inactivas', value: 'INACTIVE' }
  ];

  protected readonly categories = signal<CategoryResponse[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly bannerMessage = signal<string | null>(null);
  protected readonly selectedFilter = signal<CategoryListFilter>('TODOS');
  protected readonly processingId = signal<string | null>(null);
  protected readonly locations = signal<LocationResponse[]>([]);

  protected searchMode: SearchMode = 'name';
  protected searchTerm = '';
  protected selectedLocationId = '';
  protected newCategory: CreateCategoryRequest = {
    name: '',
    type: '',
    subtype: '',
    locationId: ''
  };

  ngOnInit(): void {
    this.loadLocations();
    this.loadCategories('TODOS');
  }

  protected loadCategories(filter: CategoryListFilter): void {
    this.selectedFilter.set(filter);
    this.searchTerm = '';
    this.runListRequest(this.requestByFilter(filter));
  }

  protected searchCategories(): void {
    const term = this.searchTerm.trim();
    if (!term) {
      return;
    }

    const request$ = this.searchMode === 'name'
      ? this.categoryService.searchByName(term)
      : this.searchMode === 'type'
        ? this.categoryService.searchByType(term)
        : this.categoryService.searchBySubtype(term);

    this.runListRequest(request$);
  }

  protected clearSearch(): void {
    this.searchTerm = '';
    this.loadCategories(this.selectedFilter());
  }

  protected toggleCreateForm(): void {
    this.isCreating.set(!this.isCreating());
    if (this.isCreating()) {
      this.resetForm();
    }
  }

  protected canSave(): boolean {
    return Boolean(
      this.newCategory.name.trim() &&
      this.newCategory.type.trim() &&
      this.newCategory.subtype.trim() &&
      this.selectedLocationId
    );
  }

  protected saveCategory(): void {
    if (!this.canSave()) {
      return;
    }

    this.isSaving.set(true);
    this.error.set(null);
    this.bannerMessage.set(null);

    const request: CreateCategoryRequest = {
      name: this.newCategory.name.trim(),
      type: this.newCategory.type.trim(),
      subtype: this.newCategory.subtype.trim(),
      locationId: this.selectedLocationId
    };

    this.categoryService.create(request).subscribe({
      next: category => {
        const locationName = this.selectedLocationName();
        this.isSaving.set(false);
        this.isCreating.set(false);
        this.resetForm();
        this.bannerMessage.set(
          `Categoria ${category.name} creada correctamente en la sede ${locationName}.`
        );
        this.loadCategories(this.selectedFilter());
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Error al crear la categoria.');
        this.isSaving.set(false);
      }
    });
  }

  protected toggleStatus(category: CategoryResponse): void {
    const nextStatus: CategoryStatus = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.processingId.set(category.id);
    this.error.set(null);
    this.bannerMessage.set(null);

    this.categoryService.updateStatus(category.id, nextStatus).subscribe({
      next: updated => {
        this.processingId.set(null);
        this.bannerMessage.set(`Categoria ${updated.name} actualizada a ${updated.status}.`);
        this.loadCategories(this.selectedFilter());
      },
      error: err => {
        this.processingId.set(null);
        this.error.set(err?.error?.message ?? 'Error al actualizar el estado.');
      }
    });
  }

  protected statusButtonLabel(category: CategoryResponse): string {
    if (this.processingId() === category.id) {
      return 'Actualizando...';
    }

    return category.status === 'ACTIVE' ? 'Desactivar' : 'Activar';
  }

  private requestByFilter(filter: CategoryListFilter): Observable<CategoryResponse[]> {
    return filter === 'TODOS'
      ? this.categoryService.getAll()
      : this.categoryService.getByStatus(filter);
  }

  private runListRequest(request$: Observable<CategoryResponse[]>): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.bannerMessage.set(null);

    request$.subscribe({
      next: categories => {
        this.categories.set(categories);
        this.isLoading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Error al cargar las categorias.');
        this.categories.set([]);
        this.isLoading.set(false);
      }
    });
  }

  private resetForm(): void {
    this.newCategory = {
      name: '',
      type: '',
      subtype: '',
      locationId: ''
    };
    this.selectedLocationId = '';
  }

  private loadLocations(): void {
    this.locationService.list().subscribe({
      next: locations => this.locations.set((locations ?? []).filter(location => location.active)),
      error: () => this.locations.set([])
    });
  }

  private selectedLocationName(): string {
    return this.locations().find(location => location.id === this.selectedLocationId)?.name ?? 'sede seleccionada';
  }

  protected locationName(locationId?: string | null): string {
    if (!locationId) {
      return 'Sin sede';
    }

    return this.locations().find(location => location.id === locationId)?.name ?? locationId.slice(0, 8);
  }
}
