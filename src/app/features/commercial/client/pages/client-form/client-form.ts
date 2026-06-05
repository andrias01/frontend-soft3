import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, finalize, of, switchMap } from 'rxjs';

import {
  CatalogOption,
  CityOption,
  Client,
  CreateClientRequest,
  UpdateClientRequest,
} from '@commercial/client/models/client.model';
import { ClientCatalogService } from '@commercial/client/services/client-catalog.service';
import {
  ClientService,
  getClientErrorMessage,
} from '@commercial/client/services/client.service';

type ClientFormControlName =
  | 'firstName'
  | 'secondName'
  | 'firstLastName'
  | 'secondLastName'
  | 'documentTypeId'
  | 'documentNumber'
  | 'email'
  | 'phone'
  | 'address'
  | 'departmentId'
  | 'cityId'
  | 'taxRegimeId'
  | 'assignedSellerId';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientForm implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly catalogService = inject(ClientCatalogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = new FormBuilder().nonNullable;
  private readonly lettersPattern = /^[A-Za-z\s]+$/;

  protected readonly isEditing = signal(false);
  protected readonly loadingClient = signal(false);
  protected readonly catalogsLoading = signal(true);
  protected readonly citiesLoading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formSubmitted = signal(false);
  protected readonly generalError = signal('');
  protected readonly successMessage = signal('');
  protected readonly catalogError = signal('');

  protected readonly documentTypes = signal<CatalogOption[]>([]);
  protected readonly departments = signal<CatalogOption[]>([]);
  protected readonly cities = signal<CityOption[]>([]);

  protected readonly pageLoading = computed(
    () => this.catalogsLoading() || this.loadingClient(),
  );

  protected readonly taxRegimes: CatalogOption[] = [
    {
      id: '036ffcc6-bb3f-487e-ba99-9b5376864456',
      label: 'Responsable de IVA',
    },
  ];

  private clientId = '';
  private loadedEmail = '';
  private pendingCityId = '';

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(this.lettersPattern)]],
    secondName: ['', [Validators.maxLength(100), Validators.pattern(this.lettersPattern)]],
    firstLastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(this.lettersPattern)]],
    secondLastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(this.lettersPattern)]],
    documentTypeId: ['', [Validators.required]],
    documentNumber: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9-]{5,30}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10,15}$/)]],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    departmentId: ['', [Validators.required]],
    cityId: ['', [Validators.required]],
    taxRegimeId: [this.taxRegimes[0]?.id ?? '', [Validators.required]],
    assignedSellerId: [1, [Validators.required, Validators.min(1)]],
    applyDiscounts: [true],
  });

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEditing.set(!!this.clientId);

    this.loadCatalogs();

    this.form.controls.departmentId.valueChanges.subscribe((departmentId) => {
      this.onDepartmentChange(departmentId);
    });

    if (this.isEditing()) {
      this.loadClient();
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

    const payload = this.buildPayload();

    this.submitting.set(true);
    const request$ = this.isEditing()
      ? this.clientService.updateClient(this.clientId, payload as UpdateClientRequest)
      : this.clientService.createClient(payload);

    request$
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Solicitud enviada correctamente');
          setTimeout(
            () =>
              this.router.navigate(['/commercial/clients'], {
                queryParams: { refreshed: '1' },
              }),
            600,
          );
        },
        error: (error) => this.generalError.set(getClientErrorMessage(error)),
      });
  }

  protected showFieldError(controlName: ClientFormControlName): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.formSubmitted());
  }

  protected fieldError(controlName: ClientFormControlName): string {
    const control = this.form.controls[controlName];

    if (!this.showFieldError(controlName)) {
      return '';
    }

    if (control.hasError('required') || control.hasError('min')) {
      return 'Este campo es obligatorio.';
    }

    if (
      controlName === 'firstName' ||
      controlName === 'secondName' ||
      controlName === 'firstLastName' ||
      controlName === 'secondLastName'
    ) {
      if (control.hasError('maxlength')) {
        return 'No puede superar 100 caracteres.';
      }
      return 'Solo se permiten letras y espacios.';
    }

    if (controlName === 'documentNumber') {
      return 'El documento debe tener entre 5 y 30 caracteres.';
    }

    if (controlName === 'email') {
      return 'Ingresa un correo electronico valido.';
    }

    if (controlName === 'phone') {
      return 'El telefono debe tener entre 10 y 15 digitos.';
    }

    if (controlName === 'address') {
      return 'La direccion no puede superar 255 caracteres.';
    }

    return 'Campo no valido.';
  }

  protected onlyDigits(event: KeyboardEvent): void {
    if (event.key.length === 1 && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  private loadCatalogs(): void {
    this.catalogsLoading.set(true);
    this.catalogError.set('');

    forkJoin({
      documentTypes: this.catalogService.getDocumentTypes(),
      departments: this.catalogService.getDepartments(),
    })
      .pipe(finalize(() => this.catalogsLoading.set(false)))
      .subscribe({
        next: ({ documentTypes, departments }) => {
          this.documentTypes.set(documentTypes);
          this.departments.set(departments);

          const messages: string[] = [];
          if (documentTypes.length === 0) {
            messages.push('tipos de documento');
          }
          if (departments.length === 0) {
            messages.push('departamentos');
          }
          if (messages.length > 0) {
            this.catalogError.set(
              `No hay ${messages.join(' ni ')} disponibles. Verifica el catalogo en la base de datos.`,
            );
          }
        },
        error: () => {
          this.documentTypes.set([]);
          this.departments.set([]);
          this.catalogError.set('No se pudieron cargar los catalogos del formulario.');
        },
      });
  }

  private onDepartmentChange(departmentId: string): void {
    if (!departmentId) {
      this.cities.set([]);
      this.form.controls.cityId.setValue('');
      return;
    }

    this.citiesLoading.set(true);

    this.catalogService
      .getCities(departmentId)
      .pipe(finalize(() => this.citiesLoading.set(false)))
      .subscribe({
        next: (cities) => {
          this.cities.set(cities);

          const preferredCityId = this.pendingCityId || this.form.controls.cityId.value;
          this.pendingCityId = '';

          const selectedCity = cities.find((city) => city.id === preferredCityId);
          this.form.controls.cityId.setValue(selectedCity?.id ?? cities[0]?.id ?? '');
        },
        error: () => {
          this.cities.set([]);
          this.form.controls.cityId.setValue('');
        },
      });
  }

  private loadClient(): void {
    this.loadingClient.set(true);
    this.generalError.set('');

    this.clientService
      .getClientById(this.clientId)
      .pipe(
        switchMap((client) => this.resolveLocation(client)),
        finalize(() => this.loadingClient.set(false)),
      )
      .subscribe({
        next: (client) => this.patchForm(client),
        error: (error) => this.generalError.set(getClientErrorMessage(error)),
      });
  }

  private resolveLocation(client: Client) {
    const cityId = client.cityId ?? '';
    if (!cityId) {
      return of(client);
    }

    return this.catalogService.getCities().pipe(
      switchMap((allCities) => {
        const city = allCities.find((item) => item.id === cityId);
        this.pendingCityId = cityId;

        if (city) {
          this.form.controls.departmentId.setValue(city.departmentId, { emitEvent: true });
        }

        return of(client);
      }),
    );
  }

  private patchForm(client: Client): void {
    this.loadedEmail = client.email;

    this.form.patchValue({
      firstName: client.firstName ?? '',
      secondName: client.secondName ?? '',
      firstLastName: client.firstLastName ?? '',
      secondLastName: client.secondLastName ?? '',
      documentTypeId: client.documentTypeId ?? '',
      documentNumber: client.documentNumber ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      cityId: client.cityId ?? '',
      taxRegimeId: client.taxRegimeId ?? '',
      assignedSellerId: client.assignedSellerId ?? 1,
      applyDiscounts: client.applyDiscounts ?? true,
    });
  }

  private buildPayload(): CreateClientRequest {
    const raw = this.form.getRawValue();

    return {
      firstName: raw.firstName.trim(),
      secondName: raw.secondName.trim(),
      firstLastName: raw.firstLastName.trim(),
      secondLastName: raw.secondLastName.trim(),
      documentTypeId: raw.documentTypeId,
      documentNumber: raw.documentNumber.trim(),
      email: (this.isEditing() ? this.loadedEmail : raw.email).trim().toLowerCase(),
      phone: raw.phone.trim(),
      address: raw.address.trim(),
      cityId: raw.cityId,
      taxRegimeId: raw.taxRegimeId,
      assignedSellerId: raw.assignedSellerId,
      applyDiscounts: raw.applyDiscounts,
    };
  }
}
