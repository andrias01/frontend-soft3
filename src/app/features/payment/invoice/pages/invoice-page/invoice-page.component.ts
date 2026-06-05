import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ENV } from '../../../../../core/config/env.config';
import { AuthService } from '@features/user/services/auth.service';
import {
  Discount,
  SaleDetailResponse,
  SaleResponse,
  SaleStatus,
  TableDTO,
  TableSessionDTO
} from '../../models/invoice.model';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import {
  InvoiceAcceptedResponse,
  InvoiceDetailRequest,
  InvoiceRequest,
  InvoiceResponse,
  InvoiceStatus,
  PageResponse
} from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';
import { LocationService } from '@features/inventory/location/services/location.service';
import { ClientService } from '@commercial/client/services/client.service';
import { ClientCatalogService } from '@commercial/client/services/client-catalog.service';
import { Client, CatalogOption, CityOption, CreateClientRequest } from '@commercial/client/models/client.model';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CustomerDiscountService } from '@commercial/customer-discount/services/customer-discount';
import { CustomerDiscount } from '@commercial/customer-discount/models/customer-discount.model';

type InvoiceFormState = {
  locationName: string;
  tableSessionId: string;
  customerId: string;
  discountId: string | null;
  discountPercentage: number;
  discountDescription: string;
};

type InvoiceSubmitErrorState = {
  message: string;
  errorCode: string | null;
  status: number | null;
  backendBody: unknown;
};

type TableLookupState = {
  loading: boolean;
  table: TableDTO | null;
  session: TableSessionDTO | null;
  tableError: string | null;
  sessionError: string | null;
  notice: string | null;
  requestedTableId: string | null;
};

type InvoiceMaps = {
  bySaleId: Record<string, InvoiceResponse>;
  activeBySaleId: Record<string, InvoiceResponse>;
};

const NO_DISCOUNT_VALUE = '__NONE__';
const COMMERCIAL_API_ROOT = ENV.apiUrl.replace(/\/api\/v1\/?$/, '');
const SALES_ENDPOINT = `${COMMERCIAL_API_ROOT}/commercial/api/v1/sales`;
const DISCOUNTS_ENDPOINT = `${COMMERCIAL_API_ROOT}/commercial/api/v1/discounts`;
const TABLES_ENDPOINT = `${COMMERCIAL_API_ROOT}/commercial/api/v1/tables`;
const ACTIVE_INVOICE_STATUSES = new Set<InvoiceStatus | string>([
  'OPEN',
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'CLOSED'
]);
const NON_BLOCKING_INVOICE_STATUSES = new Set<InvoiceStatus | string>(['CANCELLED', 'VOIDED']);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-invoice-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './invoice-page.component.html',
  styleUrl: './invoice-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoicePageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly invoiceService = inject(InvoiceService);
  private readonly locationService = inject(LocationService);
  private readonly authService = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly catalogService = inject(ClientCatalogService);
  private readonly customerDiscountService = inject(CustomerDiscountService);
  private readonly fb = new FormBuilder().nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly invoicePageSize = 100;

  protected readonly noDiscountValue = NO_DISCOUNT_VALUE;
  protected readonly locationIdFromEnv = this.authService.getLocationId() || ENV.locationId?.trim() || '';
  protected readonly customerServiceDetected = true;
  protected readonly loadedLocationName = signal<string>('');
  
  // Clients state
  protected readonly clients = signal<Client[]>([]);
  protected readonly loadingClients = signal(false);
  protected readonly customerDiscounts = signal<CustomerDiscount[]>([]);
  protected readonly loadingCustomerDiscounts = signal(false);

  protected readonly selectedClient = computed(() => {
    const id = this.resolvedCustomerId();
    if (!id) return null;
    return this.clients().find(c => c.id === id) ?? null;
  });

  protected readonly clientAppliesDiscount = computed(() => {
    return this.selectedClient()?.applyDiscounts ?? false;
  });

  protected readonly assignedCustomerDiscount = computed(() => {
    const client = this.selectedClient();
    if (!client || !client.id || !client.applyDiscounts) return null;
    
    // Find customer discount assignment
    const assignment = this.customerDiscounts().find(cd => cd.customerId === client.id);
    if (!assignment) return null;

    // Find the discount object details
    const discount = this.discounts().find(d => d.id === assignment.discountId);
    return discount && discount.status ? discount : null;
  });

  protected readonly customerDiscountPercentage = computed(() => {
    return this.assignedCustomerDiscount()?.percentage ?? 0;
  });

  protected readonly showNewClientModal = signal(false);
  protected readonly documentTypes = signal<CatalogOption[]>([]);
  protected readonly departments = signal<CatalogOption[]>([]);
  protected readonly cities = signal<CityOption[]>([]);
  protected readonly catalogsLoading = signal(false);
  protected readonly citiesLoading = signal(false);
  protected readonly clientSubmitting = signal(false);
  protected readonly clientFormError = signal('');
  protected readonly clientFormSubmitted = signal(false);
  
  protected readonly taxRegimes: CatalogOption[] = [
    {
      id: '036ffcc6-bb3f-487e-ba99-9b5376864456',
      label: 'Responsable de IVA',
    },
  ];

  protected readonly clientForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Za-z\s]+$/)]],
    secondName: ['', [Validators.maxLength(100), Validators.pattern(/^[A-Za-z\s]+$/)]],
    firstLastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Za-z\s]+$/)]],
    secondLastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/^[A-Za-z\s]+$/)]],
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

  protected readonly sales = signal<SaleResponse[]>([]);
  protected readonly discounts = signal<Discount[]>([]);
  protected readonly invoicesPage = signal<PageResponse<InvoiceResponse>>(
    this.createEmptyPage<InvoiceResponse>()
  );
  protected readonly invoicesBySaleId = signal<Record<string, InvoiceResponse>>({});
  protected readonly activeInvoicesBySaleId = signal<Record<string, InvoiceResponse>>({});
  protected readonly loadingSales = signal(false);
  protected readonly loadingInvoices = signal(false);
  protected readonly loadingDiscounts = signal(false);
  protected readonly creatingInvoice = signal(false);
  protected readonly saleQuery = signal('');
  protected readonly selectedSaleId = signal<string | null>(null);
  protected readonly form = signal<InvoiceFormState>(this.createEmptyForm());
  protected readonly salesError = signal<string | null>(null);
  protected readonly invoicesError = signal<string | null>(null);
  protected readonly discountError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly copyFeedback = signal<string | null>(null);
  protected readonly submitErrorState = signal<InvoiceSubmitErrorState | null>(null);
  protected readonly lastResponse = signal<InvoiceAcceptedResponse | null>(null);
  protected readonly lastAttemptPayload = signal<InvoiceRequest | null>(null);
  protected readonly tableLookup = signal<TableLookupState>(this.createEmptyTableLookup());
  protected readonly tables = signal<TableDTO[]>([]);

  protected readonly selectedSale = computed(() => {
    const selectedId = this.selectedSaleId();
    if (!selectedId) return null;
    return this.sales().find(sale => sale.id === selectedId) ?? null;
  });

  protected readonly selectedSaleInvoice = computed(() => {
    const saleId = this.selectedSale()?.id;
    return saleId ? this.saleInvoice(saleId) : null;
  });

  protected readonly selectedActiveInvoice = computed(() => {
    const saleId = this.selectedSale()?.id;
    return saleId ? this.saleActiveInvoice(saleId) : null;
  });

  protected readonly selectedSaleDate = computed(
    () => this.selectedSale()?.modifiedDate || this.selectedSale()?.createdDate || null
  );

  protected readonly saleCustomerId = computed(() =>
    this.normalizeOptionalString(this.pickString(this.selectedSale(), ['customerId']))
  );

  protected readonly hasCustomerFromSale = computed(() => !!this.saleCustomerId());

  protected readonly resolvedCustomerId = computed(
    () => this.saleCustomerId() ?? this.normalizeOptionalString(this.form().customerId)
  );

  protected readonly selectedTableId = computed(() => {
    const sale = this.selectedSale();
    return this.normalizeOptionalString(this.pickString(sale, ['tableId']) ?? sale?.tableId);
  });

  protected readonly invoiceDetails = computed<InvoiceDetailRequest[]>(() => {
    const sale = this.selectedSale();
    if (!sale) return [];
    return this.mapSaleDetails(sale);
  });

  protected readonly detailSubtotal = computed(() =>
    this.roundCurrency(
      this.invoiceDetails().reduce((accumulator, detail) => accumulator + detail.subtotal, 0)
    )
  );

  protected readonly baseSubtotal = computed(() => {
    const sale = this.selectedSale();
    if (!sale) return 0;

    const detailSubtotal = this.detailSubtotal();
    if (detailSubtotal > 0) {
      return detailSubtotal;
    }

    return this.roundCurrency(this.toMoneyNumber(sale.totalAmount));
  });

  protected readonly discountAmount = computed(() =>
    this.roundCurrency((this.baseSubtotal() * this.normalizedDiscountPercentage()) / 100)
  );

  protected readonly customerDiscountAmount = computed(() =>
    this.roundCurrency((this.baseSubtotal() * this.customerDiscountPercentage()) / 100)
  );

  protected readonly totalDiscountAmount = computed(() =>
    this.roundCurrency(this.discountAmount() + this.customerDiscountAmount())
  );

  protected readonly totalAmount = computed(() =>
    this.roundCurrency(this.baseSubtotal() - this.totalDiscountAmount())
  );

  protected readonly resolvedLocationId = computed(() => {
    const saleLocationId = this.normalizeOptionalString(
      this.pickString(this.selectedSale(), ['locationId']) ?? this.selectedSale()?.locationId
    );
    return saleLocationId ?? this.locationIdFromEnv;
  });

  protected readonly saleCountLabel = computed(() => {
    const total = this.filteredSales().length;
    return `${total} venta${total === 1 ? '' : 's'} disponible${total === 1 ? '' : 's'}`;
  });

  protected readonly filteredSales = computed(() => {
    const query = this.saleQuery().trim().toLowerCase();

    return this.sales()
      .filter(sale => this.isSaleInvoiceable(sale))
      .filter(sale => {
        if (!query) return true;
        return this.buildSaleSearchText(sale).includes(query);
      });
  });

  protected readonly availableDiscounts = computed(() =>
    [...this.discounts()]
      .filter(discount => discount.status)
      .sort((left, right) => left.description.localeCompare(right.description))
  );

  protected readonly selectedDiscountValue = computed(
    () => this.form().discountId ?? NO_DISCOUNT_VALUE
  );

  protected readonly selectedDiscount = computed(() => {
    const selectedId = this.form().discountId;
    if (!selectedId) return null;
    return this.availableDiscounts().find(discount => discount.id === selectedId) ?? null;
  });

  protected readonly normalizedDiscountPercentage = computed(() => {
    if (!this.form().discountId) return 0;
    return this.normalizePercent(this.form().discountPercentage);
  });

  protected readonly isSelectedSaleLocked = computed(() => !!this.selectedActiveInvoice());

  protected readonly previewProcessLabel = computed(() => {
    if (this.creatingInvoice()) return 'Creando factura';
    if (this.selectedActiveInvoice()) return 'Factura activa existente';
    if (!this.selectedSale()) return 'Sin venta seleccionada';
    if (this.validationErrors().length > 0) return 'Pendiente de validacion';
    return 'Lista para crear';
  });

  protected readonly previewProcessTone = computed(() => {
    if (this.creatingInvoice()) return 'warn';
    if (this.selectedActiveInvoice()) return 'ok';
    if (!this.selectedSale()) return 'neutral';
    if (this.validationErrors().length > 0) return 'error';
    return 'info';
  });

  protected readonly invoiceRequestPreview = computed<InvoiceRequest | null>(() => {
    const sale = this.selectedSale();
    if (!sale) return null;
    return this.buildInvoiceRequest(sale);
  });

  protected readonly previewDiscountLabel = computed(() => {
    const request = this.invoiceRequestPreview();
    if (!request) return 'Sin descuento';
    return `${request.discountDescription} (${request.discountPercentage}%)`;
  });

  protected readonly previewCustomerLabel = computed(
    () => this.resolvedCustomerId() ?? 'Sin cliente'
  );

  protected readonly previewSaleLabelShort = computed(() => {
    const saleId = this.selectedSale()?.id;
    if (!saleId) return 'N/A';
    return this.saleLabel(saleId);
  });

  protected readonly previewTableLabelText = computed(() => {
    const table = this.tableLookup().table;
    if (table) return this.tableNumberLabel(table);
    const tableId = this.selectedTableId();
    return tableId ? `ID: ${tableId.substring(0, 8)}...` : 'Sin mesa';
  });

  protected readonly previewInvoiceNumber = computed(
    () => this.selectedSaleInvoice()?.invoiceNumber ?? 'Generado por backend'
  );

  protected readonly customerInputHint = computed(() => {
    if (this.hasCustomerFromSale()) {
      return 'Se usa el customerId entregado por la venta y permanece en solo lectura.';
    }

    if (this.customerServiceDetected) {
      return 'Puedes seleccionar un cliente desde el servicio disponible.';
    }

    return 'No existe servicio reusable de clientes en frontend; el customerId es manual y opcional.';
  });

  protected readonly payloadPreviewText = computed(() => {
    const payload = this.lastAttemptPayload() ?? this.invoiceRequestPreview();
    if (!payload) {
      return 'Selecciona una venta para construir el payload.';
    }

    return this.stringifyForDebug(payload);
  });

  protected readonly submitErrorBackendBodyText = computed(() => {
    const backendBody = this.submitErrorState()?.backendBody;
    return backendBody ? this.stringifyForDebug(backendBody) : null;
  });

  protected readonly selectedInvoiceIdForActions = computed(
    () => this.selectedSaleInvoice()?.invoiceId ?? this.lastResponse()?.invoiceId ?? null
  );

  protected readonly selectedInvoiceNumberForActions = computed(
    () => this.selectedSaleInvoice()?.invoiceNumber ?? this.lastResponse()?.invoiceNumber ?? null
  );

  protected readonly selectedInvoiceStatusForActions = computed(
    () => this.selectedSaleInvoice()?.status ?? this.lastResponse()?.status ?? null
  );

  protected readonly selectedInvoiceLocationIdForActions = computed(
    () => this.selectedSaleInvoice()?.locationId ?? this.resolvedLocationId() ?? null
  );

  protected readonly validationErrors = computed(() => {
    const errors: string[] = [];
    const request = this.invoiceRequestPreview();

    if (!this.selectedSale() || !request) {
      errors.push('Selecciona una venta para construir la factura.');
      return errors;
    }

    if (!request.salesId.trim()) {
      errors.push('La venta seleccionada no tiene salesId.');
    }

    if (!request.locationId.trim()) {
      errors.push('No hay locationId disponible en la venta ni en ENV.');
    }

    if (!request.locationName.trim()) {
      errors.push('El campo Nombre de sede es obligatorio.');
    }

    if (request.details.length === 0) {
      errors.push('La factura debe tener al menos un item.');
    }

    if (request.totalAmount <= 0) {
      errors.push('El total de la factura debe ser mayor que 0.');
    }

    return errors;
  });

  protected readonly warnings = computed(() => {
    const warnings: string[] = [];
    const sale = this.selectedSale();
    const request = this.invoiceRequestPreview();
    const tableLookup = this.tableLookup();
    const manualCustomerId = this.normalizeOptionalString(this.form().customerId);
    const selectedInvoice = this.selectedSaleInvoice();

    if (!sale || !request) return warnings;

    if (selectedInvoice && !this.selectedActiveInvoice()) {
      warnings.push(
        `La venta ya tiene una factura con estado ${this.invoiceStatusLabel(selectedInvoice.status)}; al no ser activa, no bloquea una nueva factura.`
      );
    }

    if (!request.tableId) {
      warnings.push('La venta seleccionada no trae tableId; se enviara null.');
    }

    if (request.tableId && tableLookup.tableError) {
      warnings.push(`No fue posible consultar la mesa: ${tableLookup.tableError}`);
    }

    if (!this.hasCustomerFromSale() && !manualCustomerId) {
      warnings.push(
        'No existe servicio reusable de clientes en frontend; customerId queda manual y opcional.'
      );
    }

    if (manualCustomerId && !this.isUuid(manualCustomerId)) {
      warnings.push(
        'El customerId manual no parece UUID valido. Si el backend exige UUID, revisa ese valor antes de enviar.'
      );
    }

    if (request.details.some(detail => detail.quantity <= 0)) {
      warnings.push('Hay items con cantidad menor o igual a 0 en el detalle.');
    }

    if (request.details.some(detail => detail.unitPrice <= 0)) {
      warnings.push('Hay items con precio unitario menor o igual a 0 en el detalle.');
    }

    if (request.details.some(detail => detail.subtotal <= 0)) {
      warnings.push('Hay items con subtotal menor o igual a 0 en el detalle.');
    }

    if (request.details.some(detail => !detail.recipeId.trim())) {
      warnings.push(
        'Hay items sin recipeId en el detalle. No se bloquea la factura, pero el backend podria rechazarla.'
      );
    }

    if (request.details.some(detail => !detail.itemName.trim())) {
      warnings.push(
        'Hay items sin itemName en el detalle. No se bloquea la factura, pero el backend podria rechazarla.'
      );
    }

    const saleTotal = this.toMoneyNumber(sale.totalAmount);
    if (
      this.detailSubtotal() > 0 &&
      saleTotal > 0 &&
      Math.abs(this.detailSubtotal() - saleTotal) > 0.009
    ) {
      warnings.push(
        'El subtotal calculado desde los items difiere del total actual de la venta; se usara el subtotal de los items.'
      );
    }

    const discountPercentage = request.discountPercentage ?? 0;
    if (discountPercentage < 0 || discountPercentage > 100) {
      warnings.push('El descuento actual queda fuera del rango 0-100; revisa el catalogo.');
    }

    if (request.discountId && !this.isUuid(request.discountId)) {
      warnings.push('El descuento seleccionado no tiene un UUID valido.');
    }

    return warnings;
  });

  ngOnInit(): void {
    this.loadSales();
    this.loadDiscounts();
    this.loadTables();
    this.fetchLocationName();
    this.loadClients();
    this.loadCustomerDiscounts();

    this.clientForm.controls.departmentId.valueChanges.subscribe((departmentId) => {
      this.onDepartmentChange(departmentId);
    });
  }

  protected loadClients(): void {
    this.loadingClients.set(true);
    this.clientService.getClients({ active: true }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingClients.set(false))
    ).subscribe({
      next: (clients) => this.clients.set(clients),
      error: () => console.warn('No se pudieron cargar los clientes.')
    });
  }

  protected loadCustomerDiscounts(): void {
    this.loadingCustomerDiscounts.set(true);
    this.customerDiscountService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingCustomerDiscounts.set(false))
    ).subscribe({
      next: (discounts) => this.customerDiscounts.set(discounts),
      error: () => console.warn('No se pudieron cargar las asignaciones de descuentos por cliente.')
    });
  }

  protected openNewClientModal(): void {
    this.clientForm.reset({
      firstName: '',
      secondName: '',
      firstLastName: '',
      secondLastName: '',
      documentTypeId: '',
      documentNumber: '',
      email: '',
      phone: '',
      address: '',
      departmentId: '',
      cityId: '',
      taxRegimeId: this.taxRegimes[0]?.id ?? '',
      assignedSellerId: 1,
      applyDiscounts: true
    });
    this.clientFormSubmitted.set(false);
    this.clientFormError.set('');
    this.showNewClientModal.set(true);
    this.loadCatalogs();
  }

  protected closeNewClientModal(): void {
    this.showNewClientModal.set(false);
  }

  protected showClientFieldError(controlName: string): boolean {
    const control = this.clientForm.get(controlName);
    return !!(control?.invalid && (control.touched || this.clientFormSubmitted()));
  }

  protected clientFieldError(controlName: string): string {
    const control = this.clientForm.get(controlName);
    if (!control || !control.invalid) return '';

    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('email')) return 'Ingresa un correo electrónico válido.';
    if (control.hasError('pattern')) {
      if (controlName === 'phone') return 'El teléfono debe tener entre 10 y 15 dígitos.';
      if (controlName === 'documentNumber') return 'Entre 5 y 30 caracteres alfanuméricos.';
      return 'Solo se permiten letras y espacios.';
    }
    if (control.hasError('maxlength')) return 'Supera el límite de caracteres permitido.';
    return 'Campo no válido.';
  }

  protected onlyDigits(event: KeyboardEvent): void {
    if (event.key.length === 1 && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  private loadCatalogs(): void {
    this.catalogsLoading.set(true);
    forkJoin({
      documentTypes: this.catalogService.getDocumentTypes(),
      departments: this.catalogService.getDepartments(),
    })
      .pipe(finalize(() => this.catalogsLoading.set(false)))
      .subscribe({
        next: ({ documentTypes, departments }) => {
          this.documentTypes.set(documentTypes);
          this.departments.set(departments);
        },
        error: () => console.warn('Error al cargar catálogos en factura.')
      });
  }

  private onDepartmentChange(departmentId: string): void {
    if (!departmentId) {
      this.cities.set([]);
      this.clientForm.controls.cityId.setValue('');
      return;
    }

    this.citiesLoading.set(true);
    this.catalogService
      .getCities(departmentId)
      .pipe(finalize(() => this.citiesLoading.set(false)))
      .subscribe({
        next: (cities) => {
          this.cities.set(cities);
          const currentCity = this.clientForm.controls.cityId.value;
          const match = cities.find(c => c.id === currentCity);
          this.clientForm.controls.cityId.setValue(match?.id ?? cities[0]?.id ?? '');
        },
        error: () => {
          this.cities.set([]);
          this.clientForm.controls.cityId.setValue('');
        }
      });
  }

  protected saveClient(): void {
    this.clientFormSubmitted.set(true);
    this.clientFormError.set('');

    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.clientSubmitting.set(true);
    const raw = this.clientForm.getRawValue();
    const payload: CreateClientRequest = {
      firstName: raw.firstName.trim(),
      secondName: raw.secondName.trim(),
      firstLastName: raw.firstLastName.trim(),
      secondLastName: raw.secondLastName.trim(),
      documentTypeId: raw.documentTypeId,
      documentNumber: raw.documentNumber.trim(),
      email: raw.email.trim().toLowerCase(),
      phone: raw.phone.trim(),
      address: raw.address.trim(),
      cityId: raw.cityId,
      taxRegimeId: raw.taxRegimeId,
      assignedSellerId: raw.assignedSellerId,
      applyDiscounts: raw.applyDiscounts
    };

    this.clientService.createClient(payload).pipe(
      finalize(() => this.clientSubmitting.set(false))
    ).subscribe({
      next: () => {
        this.showNewClientModal.set(false);
        this.loadClients();
      },
      error: (error) => {
        const httpError = error as Partial<HttpErrorResponse> & { error?: { message?: string } };
        this.clientFormError.set(httpError.error?.message ?? 'Ocurrió un error al crear el cliente.');
      }
    });
  }

  protected loadTables(): void {
    const venueId = this.locationIdFromEnv;
    const url = venueId 
      ? `/commercial/api/v1/tables?venueId=${venueId}` 
      : `/commercial/api/v1/tables`;

    this.http.get<TableDTO[]>(url).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of([]))
    ).subscribe(tables => {
      this.tables.set(tables);
    });
  }

  private fetchLocationName(): void {
    const locationId = this.locationIdFromEnv;
    if (locationId && this.isUuid(locationId)) {
      this.locationService.getById(locationId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({ 
        next: (location) => {
          if (location?.name) {
            this.loadedLocationName.set(location.name);
            this.updateField('locationName', location.name);
          }
        },
        error: () => console.warn('No se pudo cargar el nombre de la sede automáticamente.')
      });
    }
  }

  protected loadSales(): void {
    this.loadingSales.set(true);
    this.salesError.set(null);

    this.getSales()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sales: SaleResponse[]) => {
          const sortedSales = this.sortSalesByRecency(sales);
          this.sales.set(sortedSales);
          this.loadingSales.set(false);
          this.loadInvoicesForSales(sortedSales);

          const selectedId = this.selectedSaleId();
          if (selectedId && !sortedSales.some(sale => sale.id === selectedId)) {
            this.clearSelection();
          }
        },
        error: (error: unknown) => {
          this.loadingSales.set(false);
          this.salesError.set(
            this.extractBackendMessage(error, 'No se pudieron cargar las ventas.')
          );
        }
      });
  }

  protected loadDiscounts(): void {
    this.loadingDiscounts.set(true);
    this.discountError.set(null);

    this.http
      .get(DISCOUNTS_ENDPOINT, { responseType: 'text' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: rawBody => {
          try {
            const discounts = this.normalizeDiscountsResponse(this.parseRawTextBody(rawBody));
            this.discounts.set(discounts);
            this.loadingDiscounts.set(false);
          } catch (error) {
            this.loadingDiscounts.set(false);
            this.discounts.set([]);
            this.discountError.set(
              error instanceof Error
                ? error.message
                : 'No fue posible interpretar la respuesta de descuentos.'
            );
          }
        },
        error: error => {
          this.loadingDiscounts.set(false);
          this.discounts.set([]);
          this.discountError.set(
            this.extractBackendMessage(
              error,
              `No fue posible cargar descuentos desde ${DISCOUNTS_ENDPOINT}.`
            )
          );
        }
      });
  }

  protected selectSale(sale: SaleResponse): void {
    this.selectedSaleId.set(sale.id);
    this.form.set(this.buildFormFromSale(sale));
    this.successMessage.set(null);
    this.copyFeedback.set(null);
    this.submitErrorState.set(null);
    this.lastResponse.set(null);
    this.lastAttemptPayload.set(null);
    this.loadTableContext();
  }

  protected clearSelection(): void {
    this.selectedSaleId.set(null);
    this.form.set(this.createEmptyForm());
    this.successMessage.set(null);
    this.copyFeedback.set(null);
    this.submitErrorState.set(null);
    this.lastResponse.set(null);
    this.lastAttemptPayload.set(null);
    this.tableLookup.set(this.createEmptyTableLookup());
  }

  protected updateSaleQuery(value: string): void {
    this.saleQuery.set(value);
  }

  protected updateField(
    field: Exclude<keyof InvoiceFormState, 'discountId' | 'discountPercentage'>,
    value: string
  ): void {
    this.form.update(current => ({
      ...current,
      [field]: value
    }));
    this.submitErrorState.set(null);
  }

  protected selectDiscount(value: string): void {
    if (value === NO_DISCOUNT_VALUE) {
      this.form.update(current => ({
        ...current,
        discountId: null,
        discountPercentage: 0,
        discountDescription: 'Sin descuento'
      }));
      this.submitErrorState.set(null);
      return;
    }

    const discount = this.availableDiscounts().find(item => item.id === value);
    if (!discount) return;

    this.form.update(current => ({
      ...current,
      discountId: discount.id,
      discountPercentage: this.normalizePercent(discount.percentage),
      discountDescription: discount.description
    }));
    this.submitErrorState.set(null);
  }

  private getActiveSession(tableId: string): Observable<any> {
    return this.http.get<any>(`${TABLES_ENDPOINT}/${tableId}/sessions/active`).pipe(
      catchError(() => of(null))
    );
  }

  protected loadTableContext(): void {
    const tableId = this.selectedTableId();

    if (!tableId) {
      this.tableLookup.set({
        ...this.createEmptyTableLookup(),
        notice: 'La venta no trae tableId. La factura puede continuar sin mesa.'
      });
      return;
    }

    this.tableLookup.set({
      ...this.createEmptyTableLookup(),
      loading: true,
      requestedTableId: tableId
    });

    let tableError: string | null = null;

    forkJoin({
      table: this.getTable(tableId).pipe(
        catchError((error: unknown) => {
          tableError = this.extractBackendMessage(
            error,
            'El servicio de mesas no devolvio datos para la mesa solicitada.'
          );
          return of(null);
        })
      ),
      session: this.getActiveSession(tableId)
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ table, session }) => {
      if (session && session.id) {
        this.form.update(current => ({
          ...current,
          tableSessionId: session.id
        }));
      }

      const notice = this.buildTableLookupNotice(
        table,
        session,
        tableError,
        null
      );

      this.tableLookup.set({
        loading: false,
        table,
        session,
        tableError,
        sessionError: null,
        notice,
        requestedTableId: tableId
      });
    });
  }

  protected createInvoice(): void {
    const request = this.invoiceRequestPreview();
    const sale = this.selectedSale();
    const locationId = this.resolvedLocationId();

    if (this.selectedActiveInvoice()) {
      this.submitErrorState.set({
        message: 'Esta venta ya tiene una factura activa.',
        errorCode: null,
        status: null,
        backendBody: null
      });
      return;
    }

    if (!sale || !request || !locationId || this.validationErrors().length > 0) {
      this.submitErrorState.set({
        message:
          this.validationErrors()[0] ?? 'No se pudo construir una factura valida para el envio.',
        errorCode: null,
        status: null,
        backendBody: null
      });
      return;
    }

    const payload = this.cloneInvoiceRequest(request);

    this.creatingInvoice.set(true);
    this.successMessage.set(null);
    this.copyFeedback.set(null);
    this.submitErrorState.set(null);
    this.lastResponse.set(null);
    this.lastAttemptPayload.set(payload);

    this.invoiceService
      .createInvoice(locationId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.lastResponse.set(response);
          this.successMessage.set(
            response.message?.trim() || 'La factura fue enviada correctamente al backend.'
          );
          this.loadInvoicesForSales(this.sales(), false, () => {
            this.creatingInvoice.set(false);
          });
        },
        error: error => {
          this.creatingInvoice.set(false);
          this.submitErrorState.set(this.buildSubmitErrorState(error));
        }
      });
  }

  protected saleStatusLabel(status: SaleStatus): string {
    switch (status) {
      case 'CREATED':
        return 'Creada';
      case 'IN_PROGRESS':
        return 'En proceso';
      case 'COMPLETED':
        return 'Completada';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  }

  protected saleStatusClass(status: SaleStatus): string {
    switch (status) {
      case 'CREATED':
        return 'info';
      case 'IN_PROGRESS':
        return 'warn';
      case 'COMPLETED':
        return 'ok';
      case 'CANCELLED':
        return 'error';
      default:
        return 'info';
    }
  }

  protected invoiceStatusLabel(status: InvoiceStatus | string | null | undefined): string {
    switch (this.normalizeInvoiceStatus(status)) {
      case 'OPEN':
        return 'Abierta';
      case 'PENDING':
        return 'Pendiente';
      case 'PARTIALLY_PAID':
        return 'Pago parcial';
      case 'PAID':
        return 'Pagada';
      case 'CLOSED':
        return 'Cerrada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'VOIDED':
        return 'Anulada';
      default:
        return status?.toString().trim() || 'Sin estado';
    }
  }

  protected invoiceStatusClass(status: InvoiceStatus | string | null | undefined): string {
    switch (this.normalizeInvoiceStatus(status)) {
      case 'OPEN':
      case 'PENDING':
      case 'PARTIALLY_PAID':
        return 'warn';
      case 'PAID':
      case 'CLOSED':
        return 'ok';
      case 'CANCELLED':
      case 'VOIDED':
        return 'error';
      default:
        return 'neutral';
    }
  }

  protected saleLabel(saleId: string | null | undefined): string {
    const id = this.normalizeOptionalString(saleId);
    if (!id) return 'N/A';
    return `#${id.substring(0, 8)}`;
  }

  protected saleTableLabel(tableId: string | null | undefined): string {
    const id = this.normalizeOptionalString(tableId);
    if (!id) return 'Sin mesa';

    const table = this.tables().find((t: TableDTO) => t.id === id);
    if (table) return this.tableNumberLabel(table);

    return `Mesa ${id.substring(0, 8)}`;
  }

  protected saleItemsLabel(sale: SaleResponse): string {
    const total = Array.isArray(sale.details) ? sale.details.length : 0;
    return `${total} item${total === 1 ? '' : 's'}`;
  }

  protected saleInvoice(saleId: string): InvoiceResponse | null {
    return this.invoicesBySaleId()[saleId] ?? null;
  }

  protected saleActiveInvoice(saleId: string): InvoiceResponse | null {
    return this.activeInvoicesBySaleId()[saleId] ?? null;
  }

  protected saleHasActiveInvoice(saleId: string): boolean {
    return !!this.saleActiveInvoice(saleId);
  }

  protected isSaleInvoiceable(sale: SaleResponse): boolean {
    return sale.status !== 'CANCELLED';
  }

  protected tableNumberLabel(table: TableDTO | null): string {
    if (!table) return 'No consultada';
    return `Mesa ${table.tableNumber ?? 'sin numero'}`;
  }

  protected tableStatusLabel(table: TableDTO | null): string {
    const status = table?.status;
    if (!status) return 'Sin estado';

    switch (status) {
      case 'AVAILABLE':
        return 'Disponible';
      case 'OCCUPIED':
        return 'Ocupada';
      case 'RESERVED':
        return 'Reservada';
      case 'INACTIVE':
        return 'Inactiva';
      default:
        return status;
    }
  }

  protected tableGuestCountLabel(session: TableSessionDTO | null): string {
    return session?.guestCount !== undefined ? session.guestCount.toString() : 'No disponible';
  }

  protected copyInvoiceId(invoiceId: string | null | undefined, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    const normalized = this.normalizeOptionalString(invoiceId);
    if (!normalized) {
      this.copyFeedback.set('No hay invoiceId disponible para copiar.');
      return;
    }

    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) {
      this.copyFeedback.set(`Copia manualmente este invoiceId: ${normalized}`);
      return;
    }

    void clipboard
      .writeText(normalized)
      .then(() => this.copyFeedback.set(`invoiceId copiado: ${normalized}`))
      .catch(() => this.copyFeedback.set(`Copia manualmente este invoiceId: ${normalized}`));
  }

  protected goToCashReceipt(
    invoiceId: string | null | undefined,
    locationId: string | null | undefined
  ): void {
    const normalizedInvoiceId = this.normalizeOptionalString(invoiceId);
    const normalizedLocationId = this.normalizeOptionalString(locationId);

    if (!normalizedInvoiceId || !normalizedLocationId) return;

    void this.router.navigate(['/payment/cashreceipt'], {
      queryParams: {
        invoiceId: normalizedInvoiceId,
        locationId: normalizedLocationId
      }
    });
  }

  protected stringifyForDebug(value: unknown): string {
    if (typeof value === 'string') return value;

    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }

  private loadInvoicesForSales(
    sales: SaleResponse[],
    clearErrors = true,
    onComplete?: () => void
  ): void {
    const locationIds = this.resolveInvoiceLocationIds(sales);

    if (clearErrors) {
      this.invoicesError.set(null);
    }

    if (locationIds.length === 0) {
      this.invoicesPage.set(this.createEmptyPage<InvoiceResponse>());
      this.invoicesBySaleId.set({});
      this.activeInvoicesBySaleId.set({});
      onComplete?.();
      return;
    }

    this.loadingInvoices.set(true);
    const errors: string[] = [];

    forkJoin(
      locationIds.map(locationId =>
        this.fetchAllInvoicesByLocation(locationId).pipe(
          catchError(error => {
            errors.push(
              `No fue posible consultar facturas para la sede ${locationId}: ${this.extractBackendMessage(
                error,
                'Error desconocido.'
              )}`
            );
            return of(this.createEmptyPage<InvoiceResponse>());
          })
        )
      )
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pages => {
          const mergedPage = this.mergeInvoicePages(pages);
          const invoiceMaps = this.buildInvoiceMaps(mergedPage.content);

          this.invoicesPage.set(mergedPage);
          this.invoicesBySaleId.set(invoiceMaps.bySaleId);
          this.activeInvoicesBySaleId.set(invoiceMaps.activeBySaleId);
          this.invoicesError.set(errors.length > 0 ? errors.join(' ') : null);
          this.loadingInvoices.set(false);
          onComplete?.();
        },
        error: error => {
          this.loadingInvoices.set(false);
          this.invoicesError.set(
            this.extractBackendMessage(error, 'No fue posible cargar las facturas existentes.')
          );
          onComplete?.();
        }
      });
  }

  private fetchAllInvoicesByLocation(locationId: string): Observable<PageResponse<InvoiceResponse>> {
    return this.invoiceService.getInvoicesByLocation(locationId, 0, this.invoicePageSize).pipe(
      map(page => this.normalizeInvoicePage(page)),
      switchMap(firstPage => {
        if (firstPage.totalPages <= 1) {
          return of(firstPage);
        }

        const remainingRequests = Array.from(
          { length: Math.max(firstPage.totalPages - 1, 0) },
          (_, index) =>
            this.invoiceService
              .getInvoicesByLocation(locationId, index + 1, this.invoicePageSize)
              .pipe(map(page => this.normalizeInvoicePage(page)))
        );

        return forkJoin(remainingRequests).pipe(
          map(remainingPages => this.mergeInvoicePages([firstPage, ...remainingPages]))
        );
      })
    );
  }

  private getSales(): Observable<SaleResponse[]> {
    return this.http
      .get<unknown>(SALES_ENDPOINT)
      .pipe(map(payload => this.normalizeSalesResponse(payload)));
  }

  private getTable(tableId: string): Observable<TableDTO> {
    return this.http.get<TableDTO>(`${TABLES_ENDPOINT}/${tableId}`);
  }

  private createEmptyForm(): InvoiceFormState {
    return {
      locationName: '',
      tableSessionId: '',
      customerId: '',
      discountId: null,
      discountPercentage: 0,
      discountDescription: 'Sin descuento'
    };
  }

  private createEmptyTableLookup(): TableLookupState {
    return {
      loading: false,
      table: null,
      session: null,
      tableError: null,
      sessionError: null,
      notice: null,
      requestedTableId: null
    };
  }

  private createEmptyPage<T>(): PageResponse<T> {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 0,
      first: true,
      last: true
    };
  }

  private normalizeSalesResponse(payload: unknown): SaleResponse[] {
    if (Array.isArray(payload)) {
      return payload as SaleResponse[];
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const record = payload as Record<string, unknown>;
    if (Array.isArray(record['content'])) {
      return record['content'] as SaleResponse[];
    }

    if (Array.isArray(record['data'])) {
      return record['data'] as SaleResponse[];
    }

    return [];
  }

  private resolveInvoiceLocationIds(sales: SaleResponse[]): string[] {
    const locationIds = new Set<string>();

    if (this.locationIdFromEnv) {
      locationIds.add(this.locationIdFromEnv);
    }

    for (const sale of sales) {
      const saleLocationId = this.normalizeOptionalString(
        this.pickString(sale, ['locationId']) ?? sale.locationId
      );

      if (saleLocationId) {
        locationIds.add(saleLocationId);
      }
    }

    return [...locationIds];
  }

  private normalizeInvoicePage(payload: unknown): PageResponse<InvoiceResponse> {
    if (Array.isArray(payload)) {
      return {
        ...this.createEmptyPage<InvoiceResponse>(),
        content: payload as InvoiceResponse[],
        totalElements: payload.length,
        totalPages: payload.length > 0 ? 1 : 0,
        size: payload.length,
        last: true
      };
    }

    if (!payload || typeof payload !== 'object') {
      return this.createEmptyPage<InvoiceResponse>();
    }

    const record = payload as Record<string, unknown>;
    const content = Array.isArray(record['content'])
      ? (record['content'] as InvoiceResponse[])
      : [];

    return {
      content,
      totalElements: this.toInteger(record['totalElements'], content.length),
      totalPages: this.toInteger(record['totalPages'], content.length > 0 ? 1 : 0),
      number: this.toInteger(record['number'], 0),
      size: this.toInteger(record['size'], content.length),
      first: this.toBoolean(record['first'], true),
      last: this.toBoolean(record['last'], true)
    };
  }

  private mergeInvoicePages(pages: PageResponse<InvoiceResponse>[]): PageResponse<InvoiceResponse> {
    if (pages.length === 0) {
      return this.createEmptyPage<InvoiceResponse>();
    }

    const mergedContent = pages.flatMap(page => page.content ?? []);
    const totalElements = pages.reduce(
      (accumulator, page) => accumulator + Math.max(page.content.length, 0),
      0
    );

    return {
      content: mergedContent,
      totalElements,
      totalPages: pages.length,
      number: 0,
      size: mergedContent.length,
      first: true,
      last: true
    };
  }

  private buildInvoiceMaps(invoices: InvoiceResponse[]): InvoiceMaps {
    const bySaleId: Record<string, InvoiceResponse> = {};
    const activeBySaleId: Record<string, InvoiceResponse> = {};

    for (const invoice of invoices) {
      const saleId = this.normalizeOptionalString(invoice.salesId);
      if (!saleId) continue;

      const currentInvoice = bySaleId[saleId];
      if (!currentInvoice || this.shouldReplaceInvoice(currentInvoice, invoice)) {
        bySaleId[saleId] = invoice;
      }

      if (this.isActiveInvoice(invoice)) {
        const currentActiveInvoice = activeBySaleId[saleId];
        if (!currentActiveInvoice || this.shouldReplaceInvoice(currentActiveInvoice, invoice)) {
          activeBySaleId[saleId] = invoice;
        }
      }
    }

    return { bySaleId, activeBySaleId };
  }

  private shouldReplaceInvoice(
    currentInvoice: InvoiceResponse,
    candidateInvoice: InvoiceResponse
  ): boolean {
    const currentActive = this.isActiveInvoice(currentInvoice);
    const candidateActive = this.isActiveInvoice(candidateInvoice);

    if (candidateActive !== currentActive) {
      return candidateActive;
    }

    const currentDate = this.toDateScore(currentInvoice.invoiceDate);
    const candidateDate = this.toDateScore(candidateInvoice.invoiceDate);

    if (candidateDate !== currentDate) {
      return candidateDate > currentDate;
    }

    return false;
  }

  private buildFormFromSale(sale: SaleResponse): InvoiceFormState {
    return {
      locationName: this.loadedLocationName() || this.pickString(sale, ['locationName']) || '',
      tableSessionId: this.pickString(sale, ['tableSessionId']) ?? '',
      customerId: this.pickString(sale, ['customerId']) ?? '',
      discountId: null,
      discountPercentage: 0,
      discountDescription: 'Sin descuento'
    };
  }

  private buildInvoiceRequest(sale: SaleResponse): InvoiceRequest {
    const discountId = this.normalizeOptionalString(this.form().discountId);
    const discountSelected = !!discountId;
    const selectedDiscount = this.selectedDiscount();
    
    // Combined values
    const manualPct = discountSelected ? this.normalizedDiscountPercentage() : 0;
    const custPct = this.customerDiscountPercentage();
    const combinedPercentage = this.roundCurrency(manualPct + custPct);

    let combinedDescription = '';
    const manualDesc = discountSelected
      ? this.normalizeOptionalString(this.form().discountDescription) ?? selectedDiscount?.description ?? 'Descuento'
      : '';
    const custDesc = this.assignedCustomerDiscount()?.description 
      ? `Descuento Cliente: ${this.assignedCustomerDiscount()?.description}` 
      : '';

    if (manualDesc && custDesc) {
      combinedDescription = `${manualDesc} + ${custDesc}`;
    } else {
      combinedDescription = manualDesc || custDesc || 'Sin descuento';
    }

    return {
      salesId: sale.id.trim(),
      locationId: this.resolvedLocationId(),
      locationName: this.form().locationName.trim(),
      tableId: this.selectedTableId(),
      tableSessionId: this.normalizeOptionalString(this.form().tableSessionId),
      customerId: this.resolvedCustomerId(),
      discountId: discountId || this.assignedCustomerDiscount()?.id || null,
      discountPercentage: combinedPercentage,
      discountDescription: combinedDescription,
      subtotal: this.baseSubtotal(),
      totalAmount: this.totalAmount(),
      details: this.invoiceDetails()
    };
  }

  private cloneInvoiceRequest(request: InvoiceRequest): InvoiceRequest {
    return {
      ...request,
      details: request.details.map(detail => ({ ...detail }))
    };
  }

  private mapSaleDetails(sale: SaleResponse): InvoiceDetailRequest[] {
    const details = Array.isArray(sale.details) ? sale.details : [];

    return details.map(detail => {
      const recipeId = this.pickString(detail, ['recipeId']) ?? '';
      const quantity = this.toMoneyNumber(detail.quantity);
      const unitPrice = this.toMoneyNumber(detail.unitPrice);
      const subtotal = this.roundCurrency(
        this.toMoneyNumber(detail.subtotal, quantity * unitPrice)
      );

      return {
        recipeId,
        itemName: this.resolveDetailName(detail),
        quantity,
        unitPrice,
        subtotal,
        comment: this.normalizeOptionalString(
          this.pickString(detail, ['comment', 'recipeLineComment'])
        )
      };
    });
  }

  private buildTableLookupNotice(
    table: TableDTO | null,
    session: TableSessionDTO | null,
    tableError: string | null,
    sessionError: string | null
  ): string {
    const notices: string[] = [];

    if (table) {
      notices.push(`Mesa consultada: ${this.tableNumberLabel(table)}.`);
    }

    if (session?.id) {
      notices.push('Se autocompleto tableSessionId usando la sesion activa.');
    } else if (sessionError) {
      notices.push(sessionError);
    } else {
      notices.push('No se encontro sesion activa; tableSessionId queda manual y opcional.');
    }

    if (tableError) {
      notices.push(`La consulta de la mesa devolvio advertencias: ${tableError}`);
    }

    return notices.join(' ');
  }

  private buildSubmitErrorState(error: unknown): InvoiceSubmitErrorState {
    const httpError = error as Partial<HttpErrorResponse> & { error?: unknown };
    const backendBody = httpError.error ?? null;

    return {
      message: this.extractBackendMessage(error, 'No fue posible crear la factura.'),
      errorCode:
        this.extractString(this.getRecordValue(backendBody, ['errorCode', 'code'])) ?? null,
      status: typeof httpError.status === 'number' && httpError.status > 0 ? httpError.status : null,
      backendBody
    };
  }

  private sortSalesByRecency(sales: SaleResponse[]): SaleResponse[] {
    return [...sales].sort((left, right) => {
      const leftDate = new Date(left.modifiedDate || left.createdDate || 0).getTime();
      const rightDate = new Date(right.modifiedDate || right.createdDate || 0).getTime();
      return rightDate - leftDate;
    });
  }

  private buildSaleSearchText(sale: SaleResponse): string {
    const details = Array.isArray(sale.details) ? sale.details : [];
    const invoice = this.saleInvoice(sale.id);

    return [
      sale.id,
      this.saleLabel(sale.id),
      sale.status,
      this.saleStatusLabel(sale.status),
      this.pickString(sale, ['tableId']),
      this.pickString(sale, ['customerId']),
      invoice?.invoiceId,
      invoice?.invoiceNumber,
      invoice?.status,
      details.map(detail => this.resolveDetailName(detail)).join(' ')
    ]
      .filter(value => !!value)
      .join(' ')
      .toLowerCase();
  }

  private resolveDetailName(detail: SaleDetailResponse): string {
    const recipeId = this.pickString(detail, ['recipeId']) ?? '';

    return (
      this.normalizeOptionalString(
        detail.lineDisplayName ||
          this.pickString(detail, ['itemName', 'recipeName', 'productName', 'name'])
      ) ??
      (recipeId ? `Item ${recipeId.slice(-6).toUpperCase()}` : 'Item sin nombre')
    );
  }

  private parseRawTextBody(rawBody: string): unknown {
    const normalized = rawBody.trim();

    if (!normalized) {
      return [];
    }

    try {
      return JSON.parse(normalized);
    } catch {
      return normalized;
    }
  }

  private normalizeDiscountsResponse(payload: unknown): Discount[] {
    const candidates = this.extractArray(payload, ['content', 'data', 'items']);

    if (Array.isArray(payload)) {
      return payload
        .map(item => this.normalizeDiscount(item))
        .filter((discount): discount is Discount => discount !== null);
    }

    if (candidates) {
      return candidates
        .map(item => this.normalizeDiscount(item))
        .filter((discount): discount is Discount => discount !== null);
    }

    if (payload === null || payload === undefined || payload === '') {
      return [];
    }

    if (typeof payload === 'string') {
      throw new Error(
        `La respuesta de descuentos en ${DISCOUNTS_ENDPOINT} no vino en un formato JSON soportado.`
      );
    }

    throw new Error(
      `La respuesta de descuentos en ${DISCOUNTS_ENDPOINT} no contiene un arreglo ni una propiedad content.`
    );
  }

  private normalizeDiscount(payload: unknown): Discount | null {
    if (!payload || typeof payload !== 'object') return null;

    const record = payload as Record<string, unknown>;
    const id = this.extractString(record['id']);
    const description =
      this.extractString(record['description']) ??
      this.extractString(record['name']) ??
      'Sin descripcion';

    if (!id) return null;

    return {
      id,
      categoryId: this.extractString(record['categoryId']) ?? '',
      percentage: this.toMoneyNumber(record['percentage'] as number, 0),
      description,
      status: this.toBoolean(record['status'], true),
      createdAt: this.extractString(record['createdAt']) ?? '',
      modifiedAt: this.extractString(record['modifiedAt']) ?? ''
    };
  }

  private isActiveInvoice(invoice: InvoiceResponse): boolean {
    return ACTIVE_INVOICE_STATUSES.has(this.normalizeInvoiceStatus(invoice.status));
  }

  private normalizeInvoiceStatus(status: InvoiceStatus | string | null | undefined): string {
    return status?.toString().trim().toUpperCase() ?? '';
  }

  private toDateScore(value: string | null | undefined): number {
    const timestamp = new Date(value ?? 0).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private extractBackendMessage(error: unknown, fallback: string): string {
    const httpError = error as Partial<HttpErrorResponse> & {
      error?: unknown;
      backendMessage?: unknown;
      message?: unknown;
    };
    const backendBody = httpError.error;

    return (
      this.extractString(this.getRecordValue(backendBody, ['message', 'error', 'detail', 'title'])) ??
      this.extractString(backendBody) ??
      this.extractString(httpError.backendMessage) ??
      this.extractString(httpError.message) ??
      fallback
    );
  }

  private extractTableSessionMessage(error: unknown): string {
    const httpError = error as Partial<HttpErrorResponse>;

    if (httpError.status === 404) {
      return 'La mesa no reporta una sesion activa en este momento.';
    }

    return this.extractBackendMessage(
      error,
      'No fue posible consultar la sesion activa de la mesa.'
    );
  }

  private getRecordValue(source: unknown, keys: readonly string[]): unknown {
    if (!source || typeof source !== 'object') return null;

    const record = source as Record<string, unknown>;
    for (const key of keys) {
      if (key in record) {
        return record[key];
      }
    }

    return null;
  }

  private extractArray(source: unknown, keys: readonly string[]): unknown[] | null {
    if (!source || typeof source !== 'object') return null;

    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value;
      }
    }

    return null;
  }

  private extractString(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private toInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
      if (normalized === 'active') return true;
      if (normalized === 'inactive') return false;
    }
    return fallback;
  }

  private toMoneyNumber(value: number | null | undefined, fallback = 0): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return this.roundCurrency(parsed);
  }

  private normalizePercent(value: number | null | undefined): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return this.roundCurrency(parsed);
  }

  private normalizeOptionalString(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized ? normalized : null;
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private isUuid(value: string): boolean {
    return UUID_PATTERN.test(value.trim());
  }

  private pickString(source: unknown, keys: readonly string[]): string | null {
    if (!source || typeof source !== 'object') return null;

    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }
}
