import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '../../services/product.service';
import { AuthService } from '@features/user/services/auth.service';

@Component({
  selector: 'app-product-create-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-shell">
      <div class="header">
        <p class="eyebrow">Inventario / Nuevo</p>
        <h1 class="title">Crear Producto</h1>
        <p>Registra un nuevo producto</p>
      </div>

      <form class="form-card" [formGroup]="productForm" (ngSubmit)="save()">
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
            @if (isInvalid('categoryId')) { <span class="error-msg">Debe seleccionar una categoría</span> }
          </div>

          <div class="field">
            <label>Seleccione una sede</label>
            <select class="input" [class.error-border]="isInvalid('locationId')" formControlName="locationId">
              <option value="">-- Seleccione una sede --</option>
              @for (loc of locations(); track loc.id) { 
                <option [value]="loc.id">{{ loc.name }}</option> 
              }
            </select>
            @if (isInvalid('locationId')) { <span class="error-msg">Debe seleccionar una sede</span> }
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

          <div class="field">
            <label>Precio de venta</label>
            <input type="number" class="input" [class.error-border]="isInvalid('salePrice')" formControlName="salePrice">
            @if (isInvalid('salePrice')) { <span class="error-msg">Mínimo 1</span> }
          </div>

          <div class="field">
            <label>Stock disponible</label>
            <input type="number" class="input" [class.error-border]="isInvalid('stock')" formControlName="stock">
            @if (isInvalid('stock')) { <span class="error-msg">Mínimo 1</span> }
          </div>

          <div class="field full">
            <label>Fecha de creación</label>
            <input type="date" class="input" formControlName="startDate" readonly>
          </div>
        </div>

        @if (error()) { <div class="error">{{ error() }}</div> }

        <div class="actions">
          <button type="button" class="btn-cancel" routerLink="..">Cancelar</button>
          <button class="btn-save" type="submit" [disabled]="productForm.invalid || loading()">
            {{ loading() ? 'Guardando...' : 'Guardar producto' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page-shell { display:flex; flex-direction:column; gap:1.5rem; max-width: 800px; margin: 0 auto; }
    .header { padding:1.5rem; background: #1f2937; color: white; border-radius:1rem; }
    .title { margin: 0.5rem 0; color: #fb923c; }
    .form-card { background:white; padding:2rem; border-radius:1rem; border:1px solid #e2e8f0; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
    .field { display:flex; flex-direction:column; gap:0.5rem; }
    .full { grid-column: span 2; }
    .input { padding:0.75rem; border:1px solid #cbd5e1; border-radius:0.7rem; }
    .error-border { border-color: #dc2626 !important; outline: 1px solid #dc2626; }
    .error-msg { color: #dc2626; font-size: 0.75rem; font-weight: 600; margin-top: -0.25rem; }
    .actions { display: flex; gap: 1rem; margin-top: 2rem; justify-content: flex-end; }
    .btn-save { background:#ea580c; color:white; border:none; padding:0.8rem 1.5rem; border-radius:0.7rem; cursor:pointer; font-weight: 600; }
    .btn-save:disabled { background: #94a3b8; cursor: not-allowed; }
    .btn-cancel { background: white; border: 1px solid #e2e8f0; padding: 0.8rem 1.5rem; border-radius: 0.7rem; cursor: pointer; }
    .error { margin-top:1rem; padding:0.8rem; background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; border-radius:0.7rem; }
    @media(max-width:600px){ .grid { grid-template-columns:1fr; } .full { grid-column: span 1; } }
  `]
})
export class ProductCreatePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);


  loading = signal(false);
  error = signal<string | null>(null);
  categories = signal<any[]>([]);
  locations = signal<any[]>([]);

  productForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    categoryId: ['', Validators.required],
    locationId: ['', Validators.required],
    unitOfMeasure: ['UNI', Validators.required],
    salePrice: [1, [Validators.required, Validators.min(1)]],
    stock: [1, [Validators.required, Validators.min(1)]],
    startDate: [{ value: this.getTodayDate(), disabled: true }, Validators.required]
  });

  ngOnInit() {
    this.loadData();
  }

  // Función para obtener la fecha local formateada YYYY-MM-DD
  private getTodayDate(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadData() {
    const locationId = this.authService.getLocationId();
    this.http.get<any[]>('/inventory/api/v1/categories').subscribe(data => this.categories.set(data));
    this.http.get<any[]>('/inventory/api/v1/location').subscribe(data => {
      const scopedLocations = locationId ? data.filter(location => location.id === locationId) : data;
      this.locations.set(scopedLocations);
      if (locationId) {
        this.productForm.patchValue({ locationId });
        this.productForm.get('locationId')?.disable();
      }
    });
  }

  isInvalid(field: string): boolean {
    const control = this.productForm.get(field);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  save() {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    // getRawValue incluye el campo deshabilitado (startDate)
    const payload = {
      ...this.productForm.getRawValue(),
      locationId: this.authService.getLocationId() || this.productForm.getRawValue().locationId
    };

    this.productService.create(payload as any).subscribe({
      next: () => this.router.navigate(['/inventory/product']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Error al crear el producto');
      }
    });
  }
}