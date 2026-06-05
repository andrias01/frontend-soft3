import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PurchaseResponse } from '../../models/purchase.model';

@Component({
  selector: 'app-approve-purchase-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open && purchase) {
      <div class="modal-overlay" (click)="onOpenChange.emit(false)">
        <div class="modal" (click)="$event.stopPropagation()">

          <div class="modal-header">
            <h2>Aprobar Compra</h2>
            <p>Revisa los detalles antes de aprobar</p>
          </div>

          <div class="modal-body">
            <div class="field">
              <label>Número de Orden</label>
              <input [value]="purchase.orderNumber" disabled />
            </div>
            <div class="field">
              <label>Total</label>
              <input [value]="'$' + purchase.total.toFixed(2)" disabled />
            </div>

            <div class="alert-warning">
              ¿Está seguro de aprobar esta compra? Una vez aprobada,
              podrá ser marcada como recibida.
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" (click)="onOpenChange.emit(false)">
              Cancelar
            </button>
            <button class="btn-primary" (click)="confirm()">
              Confirmar
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styleUrl: 'approve-purchase-modal.component.css'
})
export class ApprovePurchaseModalComponent {

  @Input() open = false;
  @Input() purchase: PurchaseResponse | null = null;
  @Output() onOpenChange = new EventEmitter<boolean>();
  @Output() onConfirm = new EventEmitter<void>();

  confirm(): void {
    this.onConfirm.emit();
    this.onOpenChange.emit(false);
  }
}