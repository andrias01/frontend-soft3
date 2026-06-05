import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientService } from '@commercial/customer-discount/services/client';
import { LocationService } from '@commercial/customer-discount/services/location';
import { CustomerDiscountService } from '@commercial/customer-discount/services/customer-discount';
import { CustomerDiscount } from '@commercial/customer-discount/models/customer-discount.model';
import { DiscountService } from '@commercial/discount/services/discount';
import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';

@Component({
  selector: 'app-customer-discount-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './customer-discount-detail-page.html',
  styleUrl: './customer-discount-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerDiscountDetailPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly service         = inject(CustomerDiscountService);
  private readonly discountService = inject(DiscountService);
  private readonly clientService   = inject(ClientService);
  private readonly locationService = inject(LocationService);
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);

  protected readonly item          = signal<CustomerDiscount | null>(null);
  protected readonly discountName  = signal('—');
  protected readonly clientName    = signal('—');
  protected readonly locationName  = signal('—');
  protected readonly loading       = signal(true);
  protected readonly error         = signal('');
  protected readonly showConfirm = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.service.getById(id).subscribe({
      next: (data) => {
        this.item.set(data);
        this.loading.set(false);
        this.loadNames(data);
      },
      error: () => {
        this.error.set('Esta asignación ya no existe.');
        this.loading.set(false);
        void this.router.navigate(['/commercial/customer-discount']);
      }
    });
  }

  private loadNames(data: CustomerDiscount): void {
    this.discountService.getById(data.discountId).subscribe({
      next: (d) => this.discountName.set(`${d.description} (${d.percentage}%)`),
      error: ()  => this.discountName.set('Descuento no encontrado')
    });

    this.clientService.getAll().subscribe({
      next: (clients) => {
        const c = clients.find(c => c.id === data.customerId);
        this.clientName.set(c ? `${c.firstName} ${c.firstLastName}` : '—');
      }
    });

    const locId = this.authService.getLocationId() || ENV.locationId;
    if (locId) {
      this.locationService.getById(locId).subscribe({
        next:  (loc) => this.locationName.set(loc.name),
        error: ()    => this.locationName.set('Sede no encontrada')
      });
    }
  }

  protected delete(): void {
    this.showConfirm.set(true);
  }

  protected confirmDelete(): void {
    this.showConfirm.set(false);
    const id = this.item()!.id;
    this.service.delete(id).subscribe({
      next:  () => this.router.navigate(['/commercial/customer-discount'], { state: { deletedId: id } }),
      error: () => this.error.set('Error al eliminar. Intenta de nuevo.')
    });
  }

  protected cancelDelete(): void {
    this.showConfirm.set(false);
  }
}