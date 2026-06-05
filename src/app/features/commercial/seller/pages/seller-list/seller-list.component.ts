import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable, finalize, switchMap } from 'rxjs';

import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';
import {
  CreateSellerRequest,
  DocumentTypeOption,
  Seller,
  SellerStatus,
  UpdateSellerRequest,
} from '@commercial/seller/models/seller.model';
import { SellerService } from '@commercial/seller/services/seller.service';

type SellerFormMode = 'create' | 'edit';
type SellerToastType = 'success' | 'error';
type SellerFormControlName =
  | 'documentTypeId'
  | 'identificationNumber'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'commissionPercentage'
  | 'status';

interface SellerFormValue {
  documentTypeId: string;
  locationId: string;
  identificationNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  commissionPercentage: number;
  status: SellerStatus;
}

interface SellerToast {
  type: SellerToastType;
  message: string;
}

@Component({
  selector: 'app-seller-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './seller-list.component.html',
  styleUrl: './seller-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerListComponent implements OnInit, OnDestroy {
  private readonly sellerService = inject(SellerService);
    private readonly authService = inject(AuthService);
  private readonly fb = new FormBuilder().nonNullable;
  private readonly sellerStatuses: readonly SellerStatus[] = ['ACTIVE', 'INACTIVE'];
  private readonly lettersPattern = /^[\p{L}\s]+$/u;
  private readonly decimalPattern = /^\d+(\.\d{1,2})?$/;

  protected readonly documentTypes: DocumentTypeOption[] = [
    {
      id: 'b9734b27-272a-418a-aba9-3ceb4864e39b',
      label: 'Cedula de Ciudadania',
      shortLabel: 'CC',
    },
    {
      id: '36e0f6fa-7f3f-4f0d-b8f1-0f0d5fb6c002',
      label: 'Cedula de Extranjeria',
      shortLabel: 'CE',
    },
    {
      id: '7d2e3c5b-0e83-45a1-b1b7-8db864aaf001',
      label: 'NIT',
      shortLabel: 'NIT',
    },
    {
      id: '1fbd9f4c-48e7-4df9-bf22-d21b24fbd003',
      label: 'Pasaporte',
      shortLabel: 'PP',
    },
  ];

  protected readonly sellers = signal<Seller[]>([]);
  protected readonly loading = signal(false);
  protected readonly search = signal('');
  protected readonly drawerOpen = signal(false);
  protected readonly formMode = signal<SellerFormMode>('create');
  protected readonly selectedSeller = signal<Seller | null>(null);
  protected readonly saving = signal(false);
  protected readonly formSubmitted = signal(false);
  protected readonly changingStatus = signal<string | null>(null);
  protected readonly toast = signal<SellerToast | null>(null);

  protected readonly totalSellers = computed(() => this.sellers().length);
  protected readonly activeSellers = computed(
    () => this.sellers().filter((seller) => this.statusOf(seller) === 'ACTIVE').length,
  );
  protected readonly inactiveSellers = computed(
    () => this.sellers().filter((seller) => this.statusOf(seller) === 'INACTIVE').length,
  );
  protected readonly filteredSellers = computed(() => {
    const query = this.normalize(this.search());

    if (!query) {
      return this.sellers();
    }

    return this.sellers().filter((seller) =>
      [
        seller.firstName,
        seller.lastName,
        `${seller.firstName} ${seller.lastName}`,
        seller.identificationNumber,
        seller.phone,
        seller.email,
      ].some((value) => this.normalize(value).includes(query)),
    );
  });

  protected readonly form = this.fb.group({
    documentTypeId: ['', Validators.required],
    locationId: [this.currentLocationId(), Validators.required],
    identificationNumber: ['', [Validators.required, Validators.pattern(/^\d{6,20}$/)]],
    firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(this.lettersPattern)]],
    lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(this.lettersPattern)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    commissionPercentage: [
      0,
      [Validators.required, Validators.min(0), Validators.max(30), Validators.pattern(this.decimalPattern)],
    ],
    status: ['ACTIVE' as SellerStatus, [Validators.required, this.statusValidator.bind(this)]],
  });

  ngOnInit(): void {
    this.loadSellers({ successMessage: 'Vendedores cargados correctamente' });
  }

  ngOnDestroy(): void {
    this.clearToastTimer();
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected openCreate(): void {
    this.formMode.set('create');
    this.selectedSeller.set(null);
    this.formSubmitted.set(false);
    this.form.controls.email.enable();
    this.form.reset({
      documentTypeId: '',
      locationId: this.currentLocationId(),
      identificationNumber: '',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      commissionPercentage: 0,
      status: 'ACTIVE',
    });
    this.drawerOpen.set(true);
  }

  protected openEdit(seller: Seller): void {
    this.formMode.set('edit');
    this.selectedSeller.set(seller);
    this.formSubmitted.set(false);
    this.form.reset({
      documentTypeId: seller.documentTypeId ?? '',
      locationId: seller.locationId || this.currentLocationId(),
      identificationNumber: seller.identificationNumber ?? '',
      firstName: seller.firstName ?? '',
      lastName: seller.lastName ?? '',
      phone: seller.phone ?? '',
      email: seller.email ?? '',
      commissionPercentage: Number(seller.commissionPercentage ?? 0),
      status: this.statusOf(seller),
    });
    this.form.controls.email.disable();
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (this.saving()) {
      return;
    }

    this.drawerOpen.set(false);
    this.selectedSeller.set(null);
    this.formSubmitted.set(false);
    this.form.controls.email.enable();
  }

  protected saveSeller(): void {
    this.formSubmitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue() as SellerFormValue;

    if (!raw.locationId.trim()) {
      this.showToast('error', 'No hay una sede configurada para registrar el vendedor');
      return;
    }

    const isCreating = this.formMode() === 'create';
    const request$ =
      isCreating
        ? this.sellerService.createSeller(this.buildCreatePayload(raw))
        : this.updateCurrentSeller(raw);

    if (!request$) {
      return;
    }

    this.saving.set(true);
    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.closeDrawerAfterSave();
          this.showToast('success', isCreating ? 'Vendedor creado correctamente' : 'Vendedor actualizado correctamente');
          this.loadSellers({ showLoading: false });
        },
        error: () => this.showToast('error', 'No se pudo guardar el vendedor'),
      });
  }

  protected toggleStatus(seller: Seller): void {
    if (!seller.id || this.changingStatus()) {
      return;
    }

    const nextStatus: SellerStatus = this.statusOf(seller) === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.changingStatus.set(seller.id);

    this.sellerService
      .updateStatus(seller.id, nextStatus)
      .pipe(finalize(() => this.changingStatus.set(null)))
      .subscribe({
        next: () => {
          this.showToast('success', 'Estado del vendedor actualizado');
          this.loadSellers({ showLoading: false });
        },
        error: () => this.showToast('error', 'No se pudo actualizar el estado del vendedor'),
      });
  }

  protected clearToast(): void {
    this.clearToastTimer();
    this.toast.set(null);
  }

  protected statusLabel(status: SellerStatus | undefined): string {
    return status === 'INACTIVE' ? 'Inactivo' : 'Activo';
  }

  protected statusOf(seller: Seller): SellerStatus {
    return seller.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  protected sellerName(seller: Seller): string {
    return `${seller.firstName ?? ''} ${seller.lastName ?? ''}`.trim() || 'Sin nombre';
  }

  protected documentTypeShortLabel(documentTypeId: string): string {
    return this.documentTypes.find((type) => type.id === documentTypeId)?.shortLabel ?? 'REG';
  }

  protected hasUnknownDocumentType(): boolean {
    const selected = this.form.controls.documentTypeId.value;
    return !!selected && !this.documentTypes.some((type) => type.id === selected);
  }

  protected showFieldError(controlName: SellerFormControlName): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.formSubmitted());
  }

  protected fieldError(controlName: SellerFormControlName): string {
    const control = this.form.controls[controlName];

    if (!this.showFieldError(controlName)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (controlName === 'identificationNumber') {
      return 'La identificacion debe tener entre 6 y 20 digitos.';
    }

    if (controlName === 'firstName' || controlName === 'lastName') {
      if (control.hasError('maxlength')) {
        return 'No puede superar 100 caracteres.';
      }
      return 'Solo se permiten letras y espacios.';
    }

    if (controlName === 'phone') {
      return 'El telefono debe tener exactamente 10 digitos.';
    }

    if (controlName === 'email') {
      return 'Ingresa un correo electronico valido.';
    }

    if (controlName === 'commissionPercentage') {
      return 'La comision debe estar entre 0 y 30, con maximo 2 decimales.';
    }

    if (controlName === 'status') {
      return 'El estado debe ser Activo o Inactivo.';
    }

    return 'Campo no valido.';
  }

  protected onlyDigits(event: KeyboardEvent): void {
    if (event.key.length === 1 && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  protected blockInvalidNumberInput(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  private loadSellers(options: { showLoading?: boolean; successMessage?: string } = {}): void {
    const showLoading = options.showLoading ?? true;

    if (showLoading) {
      this.loading.set(true);
    }

    this.sellerService.getSellers().subscribe({
      next: (sellers) => {
        this.sellers.set(this.scopeByLocation(sellers));
        this.loading.set(false);
        if (options.successMessage) {
          this.showToast('success', options.successMessage);
        }
      },
      error: () => {
        this.sellers.set([]);
        this.loading.set(false);
        this.showToast('error', 'No se pudieron cargar los vendedores');
      },
    });
  }

  private updateCurrentSeller(raw: SellerFormValue): Observable<unknown> | null {
    const seller = this.selectedSeller();
    const sellerId = seller?.id;

    if (!seller || !sellerId) {
      this.showToast('error', 'No se pudo guardar el vendedor');
      return null;
    }

    const request$ = this.sellerService.updateSeller(sellerId, this.buildUpdatePayload(raw, seller));
    const currentStatus = this.statusOf(seller);

    return raw.status === currentStatus
      ? request$
      : request$.pipe(switchMap(() => this.sellerService.updateStatus(sellerId, raw.status)));
  }

  private buildCreatePayload(raw: SellerFormValue): CreateSellerRequest {
    return {
      documentTypeId: raw.documentTypeId.trim(),
      locationId: raw.locationId.trim(),
      identificationNumber: raw.identificationNumber.trim(),
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      phone: raw.phone.trim(),
      email: raw.email.trim(),
      commissionPercentage: Number(raw.commissionPercentage),
    };
  }

  private buildUpdatePayload(raw: SellerFormValue, seller: Seller): UpdateSellerRequest {
    return {
      ...this.buildCreatePayload(raw),
      email: seller.email,
    };
  }

  private closeDrawerAfterSave(): void {
    this.drawerOpen.set(false);
    this.selectedSeller.set(null);
    this.formSubmitted.set(false);
    this.form.controls.email.enable();
  }

  private statusValidator(control: AbstractControl): ValidationErrors | null {
    return this.sellerStatuses.includes(control.value as SellerStatus) ? null : { sellerStatus: true };
  }

    private currentLocationId(): string {
    return this.authService.getLocationId() || ENV.locationId;
  }

  private scopeByLocation(sellers: Seller[]): Seller[] {
    const locationId = this.currentLocationId();
    return locationId ? sellers.filter(seller => seller.locationId === locationId) : sellers;
  }


  private normalize(value: string | undefined | null): string {
    return (value ?? '').toLowerCase().trim();
  }

  private showToast(type: SellerToastType, message: string): void {
    this.clearToastTimer();
    this.toast.set({
      type,
      message,
    });
    this.toastTimeoutId = window.setTimeout(() => this.toast.set(null), 4200);
  }

  private clearToastTimer(): void {
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  private toastTimeoutId: number | null = null;
}
