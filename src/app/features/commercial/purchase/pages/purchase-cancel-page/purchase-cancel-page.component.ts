import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';
import { PurchaseResponse } from '../../models/purchase.model';
import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';

@Component({
  selector: 'app-purchase-cancel-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="purchase-page">
      <header class="page-header">
        <div>
          <button class="btn-link" (click)="goBack()">← Volver</button>
          <h1>Cancelar compra</h1>
        </div>
      </header>

      <section class="card cancel-card">
        @if (purchase()) {
          <p>
            Orden: <strong>{{ purchase()?.orderNumber }}</strong> — Estado:
            <span class="badge" [ngClass]="statusClassMap[purchase()!.status]">
              {{ purchase()?.status | uppercase }}
            </span>
          </p>
        }

        <div class="field">
          <label>Motivo (Opcional)</label>
          <textarea [(ngModel)]="reason" rows="5"></textarea>
        </div>

        <div class="actions">
          <button class="btn-secondary" (click)="goBack()">Volver</button>
          <button class="btn-danger" (click)="confirm()">Confirmar cancelación</button>
        </div>
      </section>
    </div>
  `,
  styleUrl: 'purchase-cancel-page.component.css'
})
export class PurchaseCancelPageComponent implements OnInit {

  purchase = signal<PurchaseResponse | null>(null);
  statusClassMap: Record<string, string> = {
    CREATED: 'badge-gray',
    APPROVED: 'badge-yellow',
    RECEIVED: 'badge-green',
    CANCELLED: 'badge-red'
  };

  reason = '';
  private readonly authService = inject(AuthService);
  private get locationId(): string {
    return this.authService.getLocationId() || ENV.locationId;
  }

  constructor(
    public route: ActivatedRoute,
    public router: Router,
    private purchaseService: PurchaseService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.purchaseService
        .getPurchaseById(this.locationId, id)
        .subscribe(p => this.purchase.set(p));
    }
  }

  confirm(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const trimmed = this.reason.trim();
    this.purchaseService
      .updateStatus(this.locationId, id, {
        status: 'CANCELLED',
        ...(trimmed ? { cancelReason: trimmed } : {})
      })
      .subscribe(() => this.goBack());
  }

  goBack(): void {
    this.router.navigate(['/commercial/purchases']);
  }
}
