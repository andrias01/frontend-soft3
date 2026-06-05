import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '@features/user/services/auth.service';

const STOCK_SNAPSHOT_KEY = 'product_stock_snapshot';

interface StockNotification {
  id: string;
  productName: string;
  oldStock: number;
  newStock: number;
}

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="page-shell">
      <div class="hero-card">
        <div>
          <p class="eyebrow">Inventory / Product</p>
          <h1>Productos</h1>
          <p>Administra el catálogo de productos de tu sede</p>
        </div>
        <a class="btn-primary" routerLink="create">Crear producto</a>
      </div>

      <div class="filters">
        <div class="search-box">
          <input type="text" placeholder="Buscar por nombre..." [(ngModel)]="searchName" (keyup.enter)="loadProducts()" class="input" />
          <button class="btn" (click)="loadProducts()">Buscar</button>
        </div>

        <select [(ngModel)]="selectedCategory" (change)="loadProducts()" class="input">
          <option value="">Todas las categorías</option>
          @for (id of availableCategoryIds(); track id) {
            <option [value]="id">{{ categoryNames[id] || 'Cargando...' }}</option>
          }
        </select>

        <button class="btn-secondary" (click)="resetAndLoad()">Limpiar</button>

        <div class="filter-group">
          <button class="chip" [class.active]="filter() === 'TODOS'" (click)="setFilter('TODOS')">Todos</button>
          <button class="chip" [class.active]="filter() === 'BAJO_STOCK'" (click)="setFilter('BAJO_STOCK')">Bajo stock</button>
        </div>
      </div>

      <div class="table-card">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            @for (p of filteredProducts(); track p.id) {
              <tr (click)="openDetail(p)" class="row-clickable">
                <td class="primary-cell">{{ p.name }}</td>
                <td><span class="badge">{{ categoryNames[p.categoryId] || '...' }}</span></td>
                <td>{{ p.salePrice | currency }}</td>
                <td [class.text-danger]="p.stock < 10">{{ p.stock }} {{ p.unitOfMeasure }}</td>
                <td><button class="btn-edit" (click)="$event.stopPropagation(); edit(p.id)">Editar</button></td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty">No hay productos disponibles</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Notificaciones de stock actualizado -->
    <div class="toast-container">
      @for (n of notifications(); track n.id) {
        <div class="toast-stock" (click)="dismissNotification(n.id)">
          <span class="toast-icon">📦</span>
          <div class="toast-body">
            <strong>Stock actualizado</strong>
            <span>
              {{ n.productName }}:
              <span class="stock-old">{{ n.oldStock }}</span>
              →
              <span class="stock-new">{{ n.newStock }}</span>
              unidades
            </span>
          </div>
          <button class="toast-close">×</button>
        </div>
      }
    </div>

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Detalles del Producto</h3>
            <button class="close-icon" (click)="closeModal()">×</button>
          </div>

          <div class="modal-body">
            <div class="info-group">
              <span class="label">Nombre del Producto</span>
              <p class="value primary">{{ selectedProduct()?.name }}</p>
            </div>

            <div class="grid-2">
              <div class="info-group">
                <span class="label">Categoría</span>
                <p class="value">{{ categoryNames[selectedProduct()!.categoryId] }}</p>
              </div>
              <div class="info-group">
                <span class="label">Sede</span>
                <p class="value">{{ locationName() }}</p>
              </div>
              <div class="info-group">
                <span class="label">Precio</span>
                <p class="value">{{ selectedProduct()?.salePrice | currency }}</p>
              </div>
              <div class="info-group">
                <span class="label">Stock Disponible</span>
                <p class="value">{{ selectedProduct()?.stock }} {{ selectedProduct()?.unitOfMeasure }}</p>
              </div>
            </div>

            <div class="info-group">
              <span class="label">Fecha de registro</span>
              <p class="value">{{ selectedProduct()?.startDate }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeModal()">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-shell { display:flex; flex-direction:column; gap:1.5rem; }
    .hero-card { display:flex; justify-content:space-between; align-items:center; background:#1f2937; color:white; padding:1.5rem 2rem; border-radius:1rem; }
    .eyebrow { margin:0; text-transform:uppercase; font-size:0.7rem; letter-spacing:0.1rem; opacity:0.7; }

    .filters { display:flex; gap:1rem; align-items:center; flex-wrap:wrap; }
    .input { padding:0.65rem 1rem; border:1px solid #cbd5e1; border-radius:0.7rem; }

    .filter-group { display:flex; gap:0.5rem; margin-left:0.5rem; }
    .chip { border:1px solid #cbd5e1; background:white; padding:0.5rem 1.2rem; border-radius:999px; cursor:pointer; }
    .chip.active { background:#ea580c; color:white; border-color:#ea580c; }

    .btn { padding:0.65rem 1.2rem; border:none; background:#334155; color:white; border-radius:0.7rem; cursor:pointer; }
    .btn-secondary { padding:0.65rem 1.2rem; border:1px solid #cbd5e1; background:white; color:#334155; border-radius:0.7rem; cursor:pointer; }
    .btn-primary { background:#ea580c; color:white; padding:0.75rem 1.5rem; border-radius:0.7rem; text-decoration:none; font-weight:600; }

    .table-card { background:white; border-radius:1rem; border:1px solid #e2e8f0; overflow:hidden; }
    .row-clickable { cursor:pointer; }
    .row-clickable:hover { background:#f8fafc; }
    .table { width:100%; border-collapse:collapse; }
    .table td { padding:1rem; border-top:1px solid #e2e8f0; }

    .btn-edit { background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd; padding:0.4rem 0.8rem; border-radius:0.5rem; cursor:pointer; }
    .badge { background:#f1f5f9; padding:0.2rem 0.6rem; border-radius:0.4rem; font-size:0.8rem; color:#475569; }
    .text-danger { color:#dc2626; font-weight:bold; }

    /* Modal */
    .modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .modal-card { background:white; padding:0; border-radius:1.5rem; width:450px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); }
    .modal-header { padding:1.5rem; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; }
    .modal-header h3 { margin:0; color:#1e293b; }
    .close-icon { border:none; background:#f1f5f9; font-size:1.5rem; cursor:pointer; border-radius:50%; width:32px; height:32px; }
    .modal-body { padding:1.5rem; display:flex; flex-direction:column; gap:1.2rem; }
    .info-group { display:flex; flex-direction:column; gap:0.25rem; }
    .label { font-size:0.75rem; text-transform:uppercase; color:#64748b; font-weight:600; }
    .value { margin:0; color:#334155; font-weight:500; }
    .value.primary { font-size:1.25rem; color:#ea580c; font-weight:700; }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .modal-footer { padding:1rem 1.5rem; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; }

    /* Toasts */
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      z-index: 2000;
    }

    .toast-stock {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #ea580c;
      border-radius: 0.75rem;
      padding: 0.875rem 1rem;
      min-width: 300px;
      max-width: 380px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      cursor: pointer;
      animation: slideInRight 0.3s ease;
    }

    .toast-icon { font-size: 1.4rem; }

    .toast-body {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
      font-size: 0.85rem;
      color: #334155;
    }

    .toast-body strong { color: #1e293b; font-size: 0.9rem; }

    .stock-old { color: #94a3b8; text-decoration: line-through; }
    .stock-new { color: #16a34a; font-weight: 700; }

    .toast-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
  `]
})
export class ProductListPageComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  products = signal<Product[]>([]);
  filter = signal<'TODOS' | 'BAJO_STOCK'>('TODOS');
  showModal = signal(false);
  selectedProduct = signal<Product | null>(null);
  locationName = signal<string>('Cargando...');
  notifications = signal<StockNotification[]>([]);

  searchName = '';
  selectedCategory = '';
  categoryNames: Record<string, string> = {};
  availableCategoryIds = signal<string[]>([]);

  ngOnInit(): void {
    this.loadProducts();
  }

  setFilter(value: 'TODOS' | 'BAJO_STOCK'): void {
    this.filter.set(value);
  }

  resetAndLoad(): void {
    this.searchName = '';
    this.selectedCategory = '';
    this.filter.set('TODOS');
    this.loadProducts();
  }

  loadProducts(): void {
    const locationId = this.authService.getLocationId();
    const request$ = locationId
      ? this.productService.findByLocation(locationId, 0, 50, this.searchName)
      : this.productService.findAll(0, 50, this.searchName);

    request$.subscribe({
      next: (res: any) => {
        const data: Product[] = res.content || [];
        this.detectStockChanges(data);
        this.products.set(data);
        this.saveStockSnapshot(data);
        this.loadCategoryNames(data);
      }
    });
  }

  openDetail(product: Product): void {
    this.selectedProduct.set(product);
    this.showModal.set(true);
    this.locationName.set('Cargando...');
    this.http.get<any>(`/inventory/api/v1/location/${product.locationId}`)
      .subscribe({
        next: (res) => this.locationName.set(res.name),
        error: () => this.locationName.set('No encontrada')
      });
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  filteredProducts(): Product[] {
    return this.products().filter(p => {
      const matchesCategory = this.selectedCategory ? p.categoryId === this.selectedCategory : true;
      const matchesStock = this.filter() === 'BAJO_STOCK' ? p.stock < 10 : true;
      return matchesCategory && matchesStock;
    });
  }

  dismissNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }

  edit(id: string): void {
    this.router.navigate(['/inventory/product/edit', id]);
  }

  // ── Stock snapshot ────────────────────────────────────────────────────────

  private detectStockChanges(freshProducts: Product[]): void {
    const raw = sessionStorage.getItem(STOCK_SNAPSHOT_KEY);
    if (!raw) return;

    try {
      const snapshot: Record<string, number> = JSON.parse(raw);
      const newNotifications: StockNotification[] = [];

      for (const product of freshProducts) {
        const oldStock = snapshot[product.id];
        if (oldStock !== undefined && oldStock !== product.stock) {
          newNotifications.push({
            id: product.id,
            productName: product.name,
            oldStock,
            newStock: product.stock
          });
        }
      }

      if (newNotifications.length > 0) {
        this.notifications.set(newNotifications);
        // Auto-dismiss después de 8 segundos
        setTimeout(() => this.notifications.set([]), 8000);
      }
    } catch {
      sessionStorage.removeItem(STOCK_SNAPSHOT_KEY);
    }
  }

  private saveStockSnapshot(products: Product[]): void {
    const snapshot: Record<string, number> = {};
    products.forEach(p => snapshot[p.id] = p.stock);
    sessionStorage.setItem(STOCK_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }

  private loadCategoryNames(products: Product[]): void {
    const ids = [...new Set(products.map(p => p.categoryId))];
    this.availableCategoryIds.set(ids);
    ids.forEach(id => {
      if (!this.categoryNames[id]) {
        this.http.get<{ name: string }>(`/inventory/api/v1/categories/${id}`)
          .pipe(catchError(() => of({ name: 'Sin categoría' })))
          .subscribe(cat => this.categoryNames = { ...this.categoryNames, [id]: cat.name });
      }
    });
  }
}