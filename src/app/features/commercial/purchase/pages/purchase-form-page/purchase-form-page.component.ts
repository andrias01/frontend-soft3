import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PurchaseService } from '../../services/purchase.service';
import { ProviderService } from '../../services/provider.service';
import { ProductService } from '../../services/product.service';
import {
  CreatePurchaseRequest,
  CreatePurchaseItemRequest,
  PurchaseResponse
} from '../../models/purchase.model';
import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';

@Component({
  selector: 'app-purchase-form-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="purchase-page">

      <header class="page-header">
        <div>
          <button class="btn-link" (click)="goBack()">← Volver</button>
          <h1>{{ title() }}</h1>
        </div>
      </header>

      @if (loading()) {
        <div class="card">Cargando...</div>
      } @else {

        <section class="card">
          <div class="section-title">Información General</div>

          <div class="grid-2">
            <div class="field">
              <label>Proveedor</label>
              @if (readonly()) {
                <input [value]="getSupplierName(form.providerId)" disabled />
              } @else {
                <select [(ngModel)]="form.providerId" (ngModelChange)="onProviderChange()">
                  <option value="">Seleccionar proveedor</option>
                  @for (s of suppliers; track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
                <small class="helper-text">
                  Selecciona proveedor primero para cargar productos para la compra.
                </small>
              }
            </div>

            <div class="field">
              <label>Número de Orden</label>
              <input
                [value]="purchase()?.orderNumber ?? 'Generado automáticamente'"
                disabled
              />
            </div>

            @if (purchase()) {
              <div class="field">
                <label>Estado</label>
                <span class="badge" [ngClass]="statusClassMap[purchase()!.status]">
                  {{ purchase()!.status | uppercase }}
                </span>
              </div>

              <div class="field">
                <label>Total</label>
                <input [value]="purchase()!.total | currency" disabled />
              </div>

              <div class="field">
                <label>Fecha de creación</label>
                <input
                  [value]="purchase()!.createdDate | date:'dd/MM/yyyy HH:mm'"
                  disabled
                />
              </div>
            }
          </div>
        </section>

        <section class="card">
          <div class="section-title">Productos</div>

          @if (!readonly()) {
            <div class="add-product-row">
              <select
                [(ngModel)]="selectedProductId"
                [disabled]="!form.providerId"
              >
                <option value="">Seleccionar producto</option>
                @for (p of availableProducts; track p.id) {
                  <option [value]="p.id">
                    {{ p.name }} — {{ p.unitPrice | currency }}
                  </option>
                }
              </select>
              <button
                class="btn-primary"
                (click)="addProduct()"
                [disabled]="!form.providerId || !selectedProductId"
              >
                + Agregar
              </button>
            </div>
            @if (!form.providerId) {
              <div class="empty-products">
                Debes seleccionar un proveedor antes de agregar productos.
              </div>
            }
          }

          @if (items.length > 0) {
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario</th>
                  <th>Subtotal</th>
                  @if (!readonly()) { <th></th> }
                </tr>
              </thead>
              <tbody>
                @for (item of items; track item.productId; let i = $index) {
                  <tr>
                    <td>{{ getProductName(item.productId) }}</td>
                    <td>
                      @if (readonly()) {
                        {{ item.quantity }}
                      } @else {
                        <input
                          type="number"
                          min="1"
                          [(ngModel)]="item.quantity"
                          (ngModelChange)="recalculate(); saveDraft()"
                          class="input-sm"
                        />
                      }
                    </td>
                    <td>
                      @if (readonly()) {
                        {{ item.unitPrice | currency }}
                      } @else {
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          [(ngModel)]="item.unitPrice"
                          (ngModelChange)="recalculate(); saveDraft()"
                          class="input-sm"
                        />
                      }
                    </td>
                    <td>{{ (item.quantity * item.unitPrice) | currency }}</td>
                    @if (!readonly()) {
                      <td>
                        <button class="btn-danger-ghost" (click)="removeItem(i)">✕</button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>

            <div class="total-row">
              <span>Total General</span>
              <strong>{{ total | currency }}</strong>
            </div>
          } @else {
            <div class="empty-products">
              No hay productos agregados.
              @if (!readonly()) { Selecciona un producto para comenzar. }
            </div>
          }
        </section>

        @if (!readonly()) {
          <div class="form-actions">
            <button class="btn-secondary" (click)="goBack()">Cancelar</button>
            <button
              class="btn-primary"
              (click)="save()"
              [disabled]="!form.providerId || items.length === 0 || saving()"
            >
              {{ saving() ? 'Guardando...' : 'Guardar Compra' }}
            </button>
          </div>
        }

      }

    </div>
  `,
  styleUrl: 'purchase-form-page.component.css'
})
export class PurchaseFormPageComponent implements OnInit, OnDestroy {

  readonly = signal(false);
  title = signal('Nueva Compra');
  loading = signal(false);
  saving = signal(false);
  purchase = signal<PurchaseResponse | null>(null);

  form = { providerId: '' };
  items: CreatePurchaseItemRequest[] = [];
  selectedProductId = '';
  total = 0;

  suppliers: { id: string; name: string }[] = [];
  availableProducts: { id: string; name: string; unitPrice: number }[] = [];

  statusClassMap: Record<string, string> = {
    CREATED: 'badge-gray',
    APPROVED: 'badge-yellow',
    RECEIVED: 'badge-green',
    CANCELLED: 'badge-red'
  };

  private readonly DRAFT_KEY = 'purchase_form_draft';
  private readonly authService = inject(AuthService);
  private get locationId(): string {
    return this.authService.getLocationId() || ENV.locationId;
  }
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private purchaseService: PurchaseService,
    private providerService: ProviderService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.initFromRoute());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initFromRoute(): void {
    const mode = this.route.snapshot.data['mode'] as string;
    const id = this.route.snapshot.paramMap.get('id');

    this.purchase.set(null);
    this.items = [];
    this.form = { providerId: '' };
    this.total = 0;

    this.readonly.set(mode === 'detail');
    this.title.set(
      mode === 'create' ? 'Nueva Compra'
      : mode === 'edit'  ? 'Editar Compra'
      : 'Detalle de Compra'
    );

    this.loadLists();

    if (id) {
      // En edit/detail carga desde el API, no del draft
      this.clearDraft();
      this.loading.set(true);
      this.purchaseService
        .getPurchaseById(this.locationId, id)
        .subscribe(p => {
          this.purchase.set(p);
          this.form.providerId = p.providerId;
          this.items = p.items.map(i => ({
            productId: i.productId,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice)
          }));
          this.recalculate();
          this.loading.set(false);
        });
    } else {
      // En create, restaura el borrador si existe
      this.restoreDraft();
    }
  }

  loadLists(): void {
    this.providerService
      .getActiveProviders()
      .subscribe(data =>
        this.suppliers = data.map(p => ({ id: p.id, name: p.businessName }))
      );

    this.productService
      .getByLocation(this.locationId)
      .subscribe(data =>
        this.availableProducts = data.content.map(p => ({
          id: p.id,
          name: p.name,
          unitPrice: p.salePrice
        }))
      );
  }

  onProviderChange(): void {
    if (this.items.length > 0) {
      this.items = [];
      this.selectedProductId = '';
      this.recalculate();
    }
    this.saveDraft();
  }

  addProduct(): void {
    if (!this.form.providerId) return;
    const product = this.availableProducts.find(p => p.id === this.selectedProductId);
    if (!product) return;
    if (this.items.some(i => i.productId === product.id)) return;

    this.items.push({
      productId: product.id,
      quantity: 1,
      unitPrice: product.unitPrice
    });
    this.selectedProductId = '';
    this.recalculate();
    this.saveDraft();
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
    this.recalculate();
    this.saveDraft();
  }

  recalculate(): void {
    this.total = this.items.reduce(
      (sum, i) => sum + (i.quantity * i.unitPrice), 0
    );
  }

  getProductName(id: string): string {
    return this.availableProducts.find(p => p.id === id)?.name ?? id;
  }

  getSupplierName(id: string): string {
    return this.suppliers.find(s => s.id === id)?.name ?? id;
  }

  save(): void {
    if (!this.form.providerId || this.items.length === 0) return;

    const id = this.route.snapshot.paramMap.get('id');
    const request: CreatePurchaseRequest = {
      providerId: this.form.providerId,
      items: this.items
    };

    this.saving.set(true);

    const op = id
      ? this.purchaseService.updatePurchase(this.locationId, id, request)
      : this.purchaseService.createPurchase(this.locationId, request);

    op.subscribe({
      next: () => {
        this.clearDraft();
        this.goBack();
      },
      error: () => this.saving.set(false)
    });
  }

  goBack(): void {
    this.clearDraft();
    this.router.navigate(['/commercial/purchases']);
  }

  saveDraft(): void {
    if (this.readonly()) return;
    sessionStorage.setItem(this.DRAFT_KEY, JSON.stringify({
      providerId: this.form.providerId,
      items: this.items
    }));
  }

  private restoreDraft(): void {
    const raw = sessionStorage.getItem(this.DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      this.form.providerId = draft.providerId ?? '';
      this.items = draft.items ?? [];
      this.recalculate();
    } catch {
      this.clearDraft();
    }
  }

  private clearDraft(): void {
    sessionStorage.removeItem(this.DRAFT_KEY);
  }
}