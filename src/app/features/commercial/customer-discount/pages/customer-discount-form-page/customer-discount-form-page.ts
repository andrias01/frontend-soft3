import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ClientService, Client } from '@commercial/customer-discount/services/client';
import { LocationService } from '@commercial/customer-discount/services/location';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CustomerDiscountService } from '@commercial/customer-discount/services/customer-discount';
import { CustomerDiscount } from '@commercial/customer-discount/models/customer-discount.model';
import { DiscountService } from '@commercial/discount/services/discount';
import { Discount } from '@commercial/discount/models/discount.model';
import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';
import { CustomerDiscountRefreshService } from '@commercial/customer-discount/services/customer-discount-refresh.service';

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as string;
  const end   = group.get('endDate')?.value as string;
  const d     = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  if (end && end < today)        return { endDatePast: true };
  if (start && end && end < start) return { endBeforeStart: true };
  return null;
}

@Component({
  selector: 'app-customer-discount-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './customer-discount-form-page.html',
  styleUrl: './customer-discount-form-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerDiscountFormPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly service         = inject(CustomerDiscountService);
  private readonly discountService = inject(DiscountService);
  private readonly router          = inject(Router);
  private readonly route           = inject(ActivatedRoute);
  private readonly clientService   = inject(ClientService);
  private readonly locationService = inject(LocationService);
  private readonly refreshService = inject(CustomerDiscountRefreshService);

  protected readonly isEditing    = signal(false);
  protected readonly submitting   = signal(false);
  protected readonly discounts    = signal<Discount[]>([]);
  protected readonly clients      = signal<Client[]>([]);
  protected readonly locationName = signal('Cargando...');
  protected readonly generalError = signal('');
  protected readonly formSubmitted = signal(false);

  readonly locationId = this.authService.getLocationId() || ENV.locationId || '';
  readonly today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  readonly assignedAt = this.today;

  private itemId = '';

  form = new FormGroup({
    discountId: new FormControl('', [Validators.required]),
    customerId:  new FormControl('', [Validators.required]),
    startDate:   new FormControl(''),
    endDate:     new FormControl('')
  }, { validators: dateRangeValidator });

  get discountIdCtrl() { return this.form.get('discountId')!; }
  get customerIdCtrl() { return this.form.get('customerId')!; }
  get startDateCtrl()  { return this.form.get('startDate')!; }
  get endDateCtrl()    { return this.form.get('endDate')!; }

  ngOnInit(): void {
    this.discountService.getAll().subscribe({
      next: (data) => this.discounts.set(data.filter(d => d.status))
    });

    this.clientService.getAllActive().subscribe({
      next: (data) => this.clients.set(data)
    });

    if (this.locationId) {
      this.locationService.getById(this.locationId).subscribe({
        next:  (loc) => this.locationName.set(loc.name),
        error: ()    => this.locationName.set('Ubicación no encontrada')
      });
    }

    this.itemId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.itemId) {
      this.isEditing.set(true);
      this.service.getById(this.itemId).subscribe({
        next: (data: CustomerDiscount) => this.form.patchValue({
          discountId: data.discountId,
          customerId:  data.customerId,
          startDate:   data.startDate?.split('T')[0] ?? '',
          endDate:     data.endDate?.split('T')[0]   ?? ''
        })
      });
    }
  }

  clientLabel(client: Client): string {
    return `${client.firstName} ${client.firstLastName} — ${client.documentNumber}`;
  }

  save(): void {
    if (this.submitting()) return;
    this.generalError.set('');
    this.formSubmitted.set(true);
    if (this.form.invalid) return;

    this.submitting.set(true);
    const { discountId, customerId, startDate, endDate } = this.form.value;

    const body = {
      discountId:  discountId!,
      customerId:  customerId!,
      locationId:  this.locationId,
      assignedAt:  this.assignedAt || undefined,
      startDate:   startDate  || undefined,
      endDate:     endDate    || undefined
    };

    const req$ = this.isEditing()
      ? this.service.update(this.itemId, body)
      : this.service.create(body);

    req$.subscribe({
      next: () => {
        this.submitting.set(false);
        if (this.isEditing()) {
          void this.router.navigate(['/commercial/customer-discount']).then(() => this.refreshService.refresh());
        } else {
          void this.router.navigate(['/commercial/customer-discount']).then(() => {
            setTimeout(() => this.refreshService.refresh(), 800);
          });
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.generalError.set(err.error?.message ?? 'Error al guardar.');
      }
    });
  }

  protected showFieldError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.formSubmitted());
  }

  protected fieldError(controlName: string): string {
    const ctrl = this.form.get(controlName);
    if (!ctrl || ctrl.valid) return '';
    if (ctrl.errors?.['required'])     return 'Este campo es obligatorio.';
    if (ctrl.errors?.['backend'])      return ctrl.errors['backend'];
    if (this.form.errors?.['endDatePast'])     return 'La fecha de fin no puede ser anterior a hoy.';
    if (this.form.errors?.['endBeforeStart']) return 'La fecha de fin no puede ser anterior a la de inicio.';
    return 'Valor no válido.';
  }

  protected truncate(text: string, max = 100): string {
    return text && text.length > max ? text.slice(0, max) + '...' : (text ?? '');
  }
}