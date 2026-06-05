import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ENV } from '@config/env.config';
import {
  CatalogOption,
  CityOption,
  CreateProviderRequest,
  Provider,
  UpdateProviderRequest,
} from '@commercial/provider/models/provider.model';
import {
  ProvidersService,
  getProviderErrorMessage,
} from '@commercial/provider/services/provider.service';

type ProviderFormControlName =
  | 'businessName'
  | 'documentTypeId'
  | 'documentNumber'
  | 'taxRegimeId'
  | 'responsibleFirstName'
  | 'responsibleLastName'
  | 'phone'
  | 'email'
  | 'departmentId'
  | 'cityId'
  | 'address';

@Component({
  selector: 'app-provider-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './provider-form-page.html',
  styleUrl: './provider-form-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderFormPage implements OnInit {
  private readonly providerService = inject(ProvidersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = new FormBuilder().nonNullable;
  private readonly lettersPattern = /^[\p{L}\s]+$/u;

  protected readonly isEditing = signal(false);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formSubmitted = signal(false);
  protected readonly generalError = signal('');
  protected readonly successMessage = signal('');

  protected readonly documentTypes: CatalogOption[] = [
    { id: 1, label: 'NIT', shortLabel: 'NIT' },
    { id: 2, label: 'Cédula de ciudadanía', shortLabel: 'CC' },
    { id: 3, label: 'Cédula de extranjería', shortLabel: 'CE' },
    { id: 4, label: 'Pasaporte', shortLabel: 'PP' },
  ];

  protected readonly taxRegimes: CatalogOption[] = [
    { id: 1, label: 'Régimen común' },
    { id: 2, label: 'Régimen simplificado' },
    { id: 3, label: 'No responsable de IVA' },
  ];

  protected readonly departments: CatalogOption[] = [
    { id: 11, label: 'Bogotá D.C.' },
    { id: 5, label: 'Antioquia' },
    { id: 76, label: 'Valle del Cauca' },
    { id: 8, label: 'Atlántico' },
  ];

  protected readonly cities: CityOption[] = [
    { id: 11001, label: 'Bogotá', departmentId: 11 },
    { id: 5001, label: 'Medellín', departmentId: 5 },
    { id: 76001, label: 'Cali', departmentId: 76 },
    { id: 8001, label: 'Barranquilla', departmentId: 8 },
  ];

  private providerId = '';
  private loadedEmail = '';

  protected readonly form = this.fb.group({
    businessName: ['', [Validators.required, Validators.maxLength(150)]],
    documentTypeId: [0, [Validators.required, Validators.min(1)]],
    documentNumber: ['', [Validators.required, Validators.pattern(/^\d{6,20}$/)]],
    taxRegimeId: [0, [Validators.required, Validators.min(1)]],
    responsibleFirstName: [
      '',
      [Validators.required, Validators.maxLength(100), Validators.pattern(this.lettersPattern)],
    ],
    responsibleLastName: [
      '',
      [Validators.required, Validators.maxLength(100), Validators.pattern(this.lettersPattern)],
    ],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    departmentId: [0, [Validators.required, Validators.min(1)]],
    cityId: [0, [Validators.required, Validators.min(1)]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
    branchId: [Number(ENV.locationId) || 1, [Validators.required, Validators.min(1)]],
  });

  protected readonly availableCities = computed(() => {
    const departmentId = this.form.controls.departmentId.value;
    if (!departmentId) {
      return this.cities;
    }
    return this.cities.filter((city) => city.departmentId === departmentId);
  });

  ngOnInit(): void {
    this.providerId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEditing.set(!!this.providerId);

    this.form.controls.departmentId.valueChanges.subscribe((departmentId) => {
      const cityId = this.form.controls.cityId.value;
      const stillValid = this.cities.some(
        (city) => city.id === cityId && city.departmentId === departmentId,
      );
      if (!stillValid) {
        this.form.controls.cityId.setValue(0);
      }
    });

    if (this.isEditing()) {
      this.loadProvider();
      this.form.controls.email.disable();
    }
  }

  protected save(): void {
    if (this.submitting()) {
      return;
    }

    this.formSubmitted.set(true);
    this.generalError.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const branchId = this.form.controls.branchId.value;
    if (!branchId) {
      this.generalError.set('No hay una sede configurada para registrar el proveedor');
      return;
    }

    const payload = this.buildPayload();

    this.submitting.set(true);
    const request$ = this.isEditing()
      ? this.providerService.updateProvider(this.providerId, payload as UpdateProviderRequest)
      : this.providerService.createProvider(payload);

    request$
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Solicitud enviada correctamente');
          setTimeout(
            () =>
              this.router.navigate(['/commercial/provider'], {
                queryParams: { refreshed: '1' },
              }),
            600,
          );
        },
        error: (error) => this.generalError.set(getProviderErrorMessage(error)),
      });
  }

  protected showFieldError(controlName: ProviderFormControlName): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.formSubmitted());
  }

  protected fieldError(controlName: ProviderFormControlName): string {
    const control = this.form.controls[controlName];

    if (!this.showFieldError(controlName)) {
      return '';
    }

    if (control.hasError('required') || control.hasError('min')) {
      return 'Este campo es obligatorio.';
    }

    if (controlName === 'businessName' && control.hasError('maxlength')) {
      return 'No puede superar 150 caracteres.';
    }

    if (controlName === 'documentNumber') {
      return 'El documento debe tener entre 6 y 20 dígitos.';
    }

    if (controlName === 'responsibleFirstName' || controlName === 'responsibleLastName') {
      if (control.hasError('maxlength')) {
        return 'No puede superar 100 caracteres.';
      }
      return 'Solo se permiten letras y espacios.';
    }

    if (controlName === 'phone') {
      return 'El teléfono debe tener exactamente 10 dígitos.';
    }

    if (controlName === 'email') {
      return 'Ingresa un correo electrónico válido.';
    }

    if (controlName === 'address' && control.hasError('maxlength')) {
      return 'No puede superar 200 caracteres.';
    }

    return 'Campo no válido.';
  }

  protected hasUnknownDocumentType(): boolean {
    const selected = this.form.controls.documentTypeId.value;
    return !!selected && !this.documentTypes.some((type) => type.id === selected);
  }

  protected hasUnknownTaxRegime(): boolean {
    const selected = this.form.controls.taxRegimeId.value;
    return !!selected && !this.taxRegimes.some((regime) => regime.id === selected);
  }

  protected onlyDigits(event: KeyboardEvent): void {
    if (event.key.length === 1 && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  private loadProvider(): void {
    this.loading.set(true);
    this.generalError.set('');

    this.providerService
      .getProviderById(this.providerId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (provider) => this.patchForm(provider),
        error: (error) => this.generalError.set(getProviderErrorMessage(error)),
      });
  }

  private patchForm(provider: Provider): void {
    this.loadedEmail = provider.email;

    this.form.patchValue({
      businessName: provider.businessName ?? '',
      documentTypeId: provider.documentTypeId ?? 0,
      documentNumber: provider.documentNumber ?? '',
      taxRegimeId: provider.taxRegimeId ?? 0,
      responsibleFirstName: provider.responsibleFirstName ?? '',
      responsibleLastName: provider.responsibleLastName ?? '',
      phone: provider.phone ?? '',
      email: provider.email ?? '',
      departmentId: provider.departmentId ?? 0,
      cityId: provider.cityId ?? 0,
      address: provider.address ?? '',
      branchId: provider.branchId || Number(ENV.locationId) || 1,
    });
  }

  private buildPayload(): CreateProviderRequest {
    const raw = this.form.getRawValue();

    return {
      businessName: raw.businessName.trim(),
      documentTypeId: raw.documentTypeId,
      documentNumber: raw.documentNumber.trim(),
      taxRegimeId: raw.taxRegimeId,
      responsibleFirstName: raw.responsibleFirstName.trim(),
      responsibleLastName: raw.responsibleLastName.trim(),
      phone: raw.phone.trim(),
      email: (this.isEditing() ? this.loadedEmail : raw.email).trim(),
      departmentId: raw.departmentId,
      cityId: raw.cityId,
      address: raw.address.trim(),
      branchId: raw.branchId,
    };
  }
}
