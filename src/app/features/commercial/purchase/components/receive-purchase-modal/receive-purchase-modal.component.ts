import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PurchaseResponse } from '../../models/purchase.model';

@Component({
  selector: 'app-receive-purchase-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open && purchase) {
      <div class="modal-overlay" (click)="onOpenChange.emit(false)">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">

          <div class="modal-header">
            <h2>Confirmar Recepción</h2>
            <p>Verifica que todos los productos hayan sido recibidos</p>
          </div>

          <div class="modal-body">
            <div class="grid-2">
              <div class="field">
                <label>Número de Orden</label>
                <input [value]="purchase.orderNumber" disabled />
              </div>
              <div class="field">
                <label>Total</label>
                <input [value]="'$' + purchase.total.toFixed(2)" disabled />
              </div>
            </div>

            <div class="field">
              <label>Productos a Recibir</label>
              <table class="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of purchase.items; track item.productId) {
                    <tr>
                      <td>{{ getProductName(item.productId) }}</td>
                      <td>{{ item.quantity }}</td>
                      <td>$ {{ item.unitPrice.toFixed(2) }}</td>
                      <td>$ {{ item.subtotal.toFixed(2) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="alert-info">
              Al confirmar, el inventario será actualizado automáticamente
              con las cantidades indicadas.
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="onOpenChange.emit(false)">
              Cancelar
            </button>
            <button class="btn-primary" (click)="confirm()">
              Confirmar Recepción
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styleUrl: 'receive-purchase-modal.component.css'
})
export class ReceivePurchaseModalComponent {

  @Input() open = false;
  @Input() purchase: PurchaseResponse | null = null;
  @Input() products: { id: string; name: string }[] = [];
  @Output() onOpenChange = new EventEmitter<boolean>();
  @Output() onConfirm = new EventEmitter<void>();

  getProductName(productId: string): string {
    return this.products.find(p => p.id === productId)?.name ?? productId;
  }

  confirm(): void {
    this.onConfirm.emit();
    this.onOpenChange.emit(false);
  }
}