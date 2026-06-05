import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '../../services/product.service';
import { AuthService } from '@features/user/services/auth.service';

@Component({
  selector: 'app-product-edit-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-shell">
      <div class="header">
        <p class="eyebrow">Inventario / Editar</p>
        <h1 class="title">Editar Producto</h1>
        <p>Modifica los detalles del catálogo y su organización</p>
      </div>

      <form class="form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="grid">
          <div class="field">
            <label>Nombre del producto</label>
            <input class="input" [class.error-border]="isInvalid('name')" formControlName="name">
            @if (isInvalid('name')) { <span class="error-msg">Debe tener entre 2 y 100 caracteres</span> }
          </div>

          <div class="field">
            <label>Seleccione una categoría</label>
            <select class="input" [class.error-border]="isInvalid('categoryId')" formControlName="categoryId">
              <option value="">-- Seleccione una categoría --</option>
              @for (cat of categories(); track cat.id) { 
                <option [value]="cat.id">{{ cat.name }}</option> 
              }
            </select>
            @if (isInvalid('categoryId')) { <span class="error-msg">Categoría inválida o no seleccionada</span> }
          </div>

          <div class="field">
            <label>Seleccione una sede</label>
            <select class="input" [class.error-border]="isInvalid('locationId')" formControlName="locationId">
              <option value="">-- Seleccione una sede --</option>
              @for (loc of locations(); track loc.id) { 
                <option [value]="loc.id">{{ loc.name }}</option> 
              }
            </select>
            @if (isInvalid('locationId')) { <span class="error-msg">Sede inválida o no seleccionada</span> }
          </div>

          <div class="field">
            <label>Precio de venta</label>
            <input class="input" [class.error-border]="isInvalid('salePrice')" type="number" formControlName="salePrice">
            @if (isInvalid('salePrice')) { <span class="error-msg">El precio debe ser >= 1</span> }
          </div>

          <div class="field">
            <label>Stock disponible</label>
            <input class="input" [class.error-border]="isInvalid('stock')" type="number" formControlName="stock">
            @if (isInvalid('stock')) { <span class="error-msg">El stock debe ser >= 1</span> }
          </div>

          <div class="field">
            <label>Unidad de medida</label>
            <select class="input" formControlName="unitOfMeasure">
              <option value="KG">Kilogramos (KG)</option>
              <option value="GR">Gramos (GR)</option>
              <option value="LI">Litros (LI)</option>
              <option value="UNI">Unidades (UNI)</option>
            </select>
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn-cancel" (click)="cancel()">Cancelar</button>
          <button class="btn-save" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Custom Modal -->
    @if (modalMessage()) {
      <div class="modal-backdrop">
        <div class="modal-container">
          <div class="modal-header">
            <h3>⚠️ Notificación</h3>
          </div>
          <div class="modal-body">
            <p>{{ modalMessage() }}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-modal-ok" (click)="modalMessage.set(null)">Aceptar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-shell { display:flex; flex-direction:column; gap:1.5rem; max-width: 800px; margin: 0 auto; }
    .header { padding:1.5rem; background: #1f2937; color: white; border-radius:1rem; }
    .title { margin: 0.5rem 0; color: #fb923c; }
    .form-card { background:white; padding:2rem; border-radius:1rem; border:1px solid #e2e8f0; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
    .field { display:flex; flex-direction:column; gap:0.5rem; }
    .input { padding:0.75rem; border:1px solid #cbd5e1; border-radius:0.7rem; }
    .error-border { border-color: #dc2626 !important; outline: 1px solid #dc2626; }
    .error-msg { color: #dc2626; font-size: 0.75rem; font-weight: 600; margin-top: -0.25rem; }
    .actions { display: flex; gap: 1rem; margin-top: 2rem; justify-content: flex-end; }
    .btn-save { background:#ea580c; color:white; border:none; padding:0.8rem 1.5rem; border-radius:0.7rem; cursor:pointer; font-weight: 600; }
    .btn-save:disabled { background: #94a3b8; cursor: not-allowed; }
    .btn-cancel { background: white; border: 1px solid #e2e8f0; padding: 0.8rem 1.5rem; border-radius: 0.7rem; cursor: pointer; }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal-container {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      width: 90%;
      max-width: 450px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: 1px solid #e2e8f0;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header h3 {
      margin: 0;
      color: #ea580c;
      font-size: 1.25rem;
    }
    .modal-body p {
      margin: 0;
      color: #334155;
      line-height: 1.5;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
    }
    .btn-modal-ok {
      background: #ea580c;
      color: white;
      border: none;
      padding: 0.6rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-modal-ok:hover {
      background: #c2410c;
    }
  `]
})
export class ProductEditPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  loading = signal(false);
  categories = signal<any[]>([]);
  locations = signal<any[]>([]); // Nueva señal
  modalMessage = signal<string | null>(null);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    categoryId: ['', Validators.required],
    locationId: ['', Validators.required],
    salePrice: [1, [Validators.required, Validators.min(1)]],
    stock: [1, [Validators.required, Validators.min(1)]],
    unitOfMeasure: ['UNI', Validators.required],
    startDate: [new Date().toISOString().split('T')[0], Validators.required]
  });

  constructor() {
    effect(() => {
      // Validamos tanto categorías como sedes cuando ambas señales tengan datos
      if (this.categories().length > 0 && this.locations().length > 0) {
        this.validateSelects();
      }
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadLocations(); // Nueva carga
    const id = this.route.snapshot.paramMap.get('id')!;
    this.productService.findById(id).subscribe(res => {
      this.form.patchValue(res as any);
      this.validateSelects();
    });
  }

  loadCategories() {
    this.http.get<any[]>('/inventory/api/v1/categories').subscribe(data => this.categories.set(data));
  }

  loadLocations() {
    const locationId = this.authService.getLocationId();
    this.http.get<any[]>('/inventory/api/v1/location').subscribe(data => {
      const scopedLocations = locationId ? data.filter(location => location.id === locationId) : data;
      this.locations.set(scopedLocations);
      if (locationId) {
        this.form.patchValue({ locationId });
        this.form.get('locationId')?.disable();
      }
    });
  }

  validateSelects() {
    // Validar Categoría
    const catId = this.form.get('categoryId')?.value;
    if (catId && !this.categories().some(c => c.id === catId)) {
      this.form.get('categoryId')?.setErrors({ invalid: true });
    }

    // Validar Sede
    const locId = this.form.get('locationId')?.value;
    if (locId && !this.locations().some(l => l.id === locId)) {
      this.form.get('locationId')?.setErrors({ invalid: true });
    }
  }

  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    
    this.loading.set(true);
    const id = this.route.snapshot.paramMap.get('id')!;
    this.productService.update(id, { ...this.form.getRawValue(), locationId: this.authService.getLocationId() ||
      this.form.getRawValue().locationId } as any).subscribe({
      next: () => this.router.navigate(['/inventory/product']),
      error: (err) => {
        this.loading.set(false);
        this.modalMessage.set('Error: ' + (err.error?.message || 'Error al actualizar el producto'));
      }
    });
  }

  cancel() { this.router.navigate(['/inventory/product']); }
}