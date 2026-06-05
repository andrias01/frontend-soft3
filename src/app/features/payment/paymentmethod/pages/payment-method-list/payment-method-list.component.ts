import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentMethodService } from '../../services/payment-method.service';
import { PaymentMethodResponse, CreatePaymentMethodRequest } from '@payment/paymentmethod/models/payment-method.model';

@Component({
  selector: 'app-payment-method-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Métodos de Pago</h1>
        <p class="page-subtitle">Gestión y visualización de métodos de pago.</p>
      </div>
      <button class="btn-primary" (click)="toggleCreateForm()">
        {{ isCreating() ? 'Cancelar' : '+ Nuevo Método' }}
      </button>
    </div>

    @if (isCreating()) {
      <div class="form-card">
        <h2>Crear Método de Pago</h2>
        <div class="field-group">
          <label for="name">Nombre</label>
          <input id="name" class="input" [(ngModel)]="newMethod.name" placeholder="Ej: Tarjeta de Crédito" />
        </div>
        <div class="field-group">
          <label for="description">Descripción</label>
          <input id="description" class="input" [(ngModel)]="newMethod.description" placeholder="Descripción del método..." />
        </div>
        <div class="field-group-inline">
          <label for="active">Activo</label>
          <input id="active" type="checkbox" [(ngModel)]="newMethod.active" />
        </div>
        <div class="form-actions">
          <button class="btn-primary" [disabled]="isSaving() || !newMethod.name" (click)="saveMethod()">
            {{ isSaving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    }

    @if (isLoading()) {
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Cargando métodos de pago...</p>
      </div>
    }

    @if (error()) {
      <div class="alert-error">
        <strong>Error:</strong> {{ error() }}
      </div>
    }

    @if (!isLoading() && !error()) {
      @if (methods().length === 0) {
        <div class="empty-state">
          <p>No hay métodos de pago registrados.</p>
        </div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (method of methods(); track method.id) {
                <tr>
                  <td class="strong">{{ method.name }}</td>
                  <td>{{ method.description }}</td>
                  <td>
                    <span [class]="'badge badge-' + (method.active ? 'active' : 'cancelled')">
                      {{ method.active ? 'ACTIVO' : 'INACTIVO' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn-secondary" (click)="toggleStatus(method.id)">
                      {{ method.active ? 'Desactivar' : 'Activar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    .page-title { font-size: 1.75rem; font-weight: 700; color: var(--color-secondary); margin: 0 0 0.25rem 0; }
    .page-subtitle { color: #64748b; margin: 0; font-size: 0.9375rem; }
    .btn-primary { background: var(--color-primary); color: white; padding: 0.6rem 1.25rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.875rem; border: none; cursor: pointer; transition: background 0.2s; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: white; border: 1px solid #e2e8f0; color: #1e293b; padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.8125rem; cursor: pointer; transition: background 0.2s; }
    .btn-secondary:hover { background: #f1f5f9; }
    
    .form-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem; max-width: 500px; }
    .form-card h2 { font-size: 1.25rem; margin: 0 0 0.5rem 0; color: var(--color-secondary); }
    .field-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .field-group-inline { display: flex; align-items: center; gap: 0.5rem; }
    .field-group label { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .input { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }
    .form-actions { margin-top: 0.5rem; }

    .loading-container { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; color: #64748b; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 1rem 1.25rem; border-radius: 0.5rem; margin-bottom: 1.5rem; }
    .empty-state { text-align: center; padding: 4rem 0; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
    .table-wrapper { background: white; border-radius: 0.75rem; border: 1px solid #e2e8f0; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .data-table thead { background: #f8fafc; }
    .data-table th { padding: 0.875rem 1rem; text-align: left; font-weight: 600; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 0.875rem 1rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: #f8fafc; }
    .strong { font-weight: 600; }
    .badge { display: inline-block; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-active { background: #dcfce7; color: #16a34a; }
    .badge-cancelled { background: #fee2e2; color: #dc2626; }
  `]
})
export class PaymentMethodListComponent implements OnInit {
  private readonly service = inject(PaymentMethodService);

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly methods = signal<PaymentMethodResponse[]>([]);
  
  protected readonly isCreating = signal(false);
  protected readonly isSaving = signal(false);
  protected newMethod: CreatePaymentMethodRequest = { name: '', description: '', active: true };

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.service.getAll().subscribe({
      next: (data) => {
        this.methods.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cargar los métodos de pago.');
        this.isLoading.set(false);
      }
    });
  }

  protected toggleCreateForm(): void {
    this.isCreating.set(!this.isCreating());
    if (this.isCreating()) {
      this.newMethod = { name: '', description: '', active: true };
    }
  }

  protected saveMethod(): void {
    if (!this.newMethod.name) return;
    this.isSaving.set(true);
    this.service.create(this.newMethod).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isCreating.set(false);
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al crear el método de pago.');
        this.isSaving.set(false);
      }
    });
  }

  protected toggleStatus(id: string): void {
    this.service.toggleStatus(id).subscribe({
      next: () => {
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cambiar estado.');
      }
    });
  }
}
