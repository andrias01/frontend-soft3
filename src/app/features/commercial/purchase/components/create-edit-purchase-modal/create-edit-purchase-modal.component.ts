import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PurchaseResponse,
  CreatePurchaseRequest,
  CreatePurchaseItemRequest
} from '../../models/purchase.model';

interface ProductOption {
  id: string;
  name: string;
  unitPrice: number;
}

@Component({
  selector: 'app-create-edit-purchase-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (open) {
      <div class="modal-overlay" (click)="onOpenChange.emit(false)">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">

          <div class="modal-header">
            <h2>{{ readonly ? 'Detalle de Compra' : (purchase ? 'Editar Compra' : 'Nueva Compra') }}</h2>
            <p>{{ purchase ? 'Modifica los detalles' : 'Completa los detalles para crear una orden' }}</p>
          </div>

          <div class="modal-body">

            <!-- Información general -->
            <div class="section-title">Información General</div>
            <div class="grid-2">
              <div class="field">
                <label>Proveedor</label>
                <select [(ngModel)]="form.providerId" [disabled]="readonly">
                  <option value="">Seleccionar proveedor</option>
                  @for (s of suppliers; track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Número de Orden</label>
                <input [value]="purchase?.orderNumber ?? 'Generado automáticamente'" disabled />
              </div>
            </div>

            <!-- Productos -->
            <div class="section-title">Productos</div>
            @if (!readonly) {
            <div class="add-product-row">
              <select [(ngModel)]="selectedProductId">
                <option value="">Seleccionar producto</option>
                @for (p of availableProducts; track p.id) {
                  <option [value]="p.id">{{ p.name }} - $ {{ p.unitPrice.toFixed(2) }}</option>
                }
              </select>
              <button class="btn-primary" (click)="addProduct()" [disabled]="!selectedProductId">
                + Agregar
              </button>
            </div>
            }

            @if (items.length > 0) {
              <table class="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of items; track item.productId; let i = $index) {
                    <tr>
                      <td>{{ getProductName(item.productId) }}</td>
                      <td>
                        @if (readonly) {
                          <span>{{ item.quantity }}</span>
                        } @else {
                          <input
                            type="number"
                            min="1"
                            [(ngModel)]="item.quantity"
                            (ngModelChange)="recalculate()"
                            class="input-sm"
                          />
                        }
                      </td>
                      <td>
                        @if (readonly) {
                          {{ item.unitPrice | currency:'USD':'symbol':'1.2-2' }}
                        } @else {
                          <input type="number" min="0" step="0.01" [(ngModel)]="item.unitPrice" (ngModelChange)="recalculate()" class="input-sm" />
                        }
                      </td>
<td>$ {{ (item.quantity * item.unitPrice).toFixed(2) }}</td>
                      <td>
                        @if (!readonly) {<button class="btn-danger-ghost" (click)="removeItem(i)">✕</button>}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <div class="total-row">
                <span>Total General</span>
                <strong>$ {{ total.toFixed(2) }}</strong>
              </div>
            } @else {
              <div class="empty-products">
                No hay productos agregados. Selecciona un producto para comenzar.
              </div>
            }

          </div>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="onOpenChange.emit(false)">
              Cancelar
            </button>
            @if (!readonly) {
            <button
              class="btn-primary"
              (click)="save()"
              [disabled]="!form.providerId || items.length === 0">
              Guardar
            </button>
            }
          </div>

        </div>
      </div>
    }
  `
})
export class CreateEditPurchaseModalComponent implements OnChanges {

  @Input() open = false;
  @Input() purchase: PurchaseResponse | null = null;
  @Input() suppliers: { id: string; name: string }[] = [];
  @Input() availableProducts: ProductOption[] = [];
  @Input() readonly = false;
  @Output() onOpenChange = new EventEmitter<boolean>();
  @Output() onSave = new EventEmitter<CreatePurchaseRequest>();

  form = { providerId: '' };
  items: CreatePurchaseItemRequest[] = [];
  selectedProductId = '';
  total = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      if (this.purchase) {
        this.form.providerId = this.purchase.providerId;
        this.items = this.purchase.items.map(i => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice)
        }));
      } else {
        this.form.providerId = '';
        this.items = [];
        this.selectedProductId = '';
      }
      this.recalculate();
    }
  }

  addProduct(): void {
    const product = this.availableProducts.find(p => p.id === this.selectedProductId);
    if (!product) return;

    const exists = this.items.some(i => i.productId === product.id);
    if (exists) return;

    this.items.push({
      productId: product.id,
      quantity: 1,
      unitPrice: product.unitPrice
    });

    this.selectedProductId = '';
    this.recalculate();
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
    this.recalculate();
  }

  recalculate(): void {
    this.total = this.items.reduce(
      (sum, i) => sum + (i.quantity * i.unitPrice), 0
    );
  }

  getProductName(productId: string): string {
    return this.availableProducts.find(p => p.id === productId)?.name ?? productId;
  }

  save(): void {
    if (!this.form.providerId || this.items.length === 0) return;

    this.onSave.emit({
      providerId: this.form.providerId,
      items: this.items
    });
  }
}