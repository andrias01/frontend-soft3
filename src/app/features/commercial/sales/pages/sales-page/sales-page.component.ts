import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EMPTY, catchError, finalize, forkJoin, interval, of, switchMap, take, timer } from 'rxjs';
import {
  CartItem,
  RecipePreparationTrace,
  RecipeResponse,
  RestaurantTable,
  SaleResponse,
  SaleStatus,
  Seller
} from '../../models/sales.model';
import { RecipeService } from '../../services/recipe.service';
import { SalesService } from '../../services/sales.service';
import { SellerTableService } from '../../services/seller-table.service';
import { EnvironmentService } from '../../../../../core/services/environment.service';
import { TableService } from '../../../tables/services/table.service';

type ToastType = 'success' | 'error';

type ToastMessage = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
};

@Component({
  selector: 'app-sales-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './sales-page.component.html',
  styleUrl: './sales-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesPageComponent implements OnInit {
  recipes: RecipeResponse[] = [];
  sales: SaleResponse[] = [];
  filteredSales: SaleResponse[] = [];
  cartItems: CartItem[] = [];
  tracesBySaleId: Record<string, RecipePreparationTrace[]> = {};

  sellers: Seller[] = [];
  tables: RestaurantTable[] = [];
  sellerQuery = '';
  tableQuery = '';

  recipeSearchTerm = '';
  recipeStatusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  recipeMinPrice: number | null = null;
  recipeMaxPrice: number | null = null;
  recipeSort: 'NAME_ASC' | 'NAME_DESC' | 'PRICE_ASC' | 'PRICE_DESC' = 'NAME_ASC';

  saleSearchTerm = '';
  saleStatusFilter: 'ALL' | SaleStatus = 'ALL';
  saleDateFrom: string | null = null;
  saleDateTo: string | null = null;
  saleMinTotal: number | null = null;
  saleMaxTotal: number | null = null;

  selectedSellerId = '';
  selectedSellerName = '';
  selectedTableId = '';
  selectedTableName = '';

  showCommentModal = false;
  showSellerModal = false;
  showTableModal = false;
  showDeleteModal = false;
  showUpdateModal = false;
  showTraceModal = false;

  traceLoading = false;
  selectedTraceSaleId = '';

  selectedCartRecipeId = '';
  modalComment = 'Sin observaciones';
  deletingSaleId = '';
  loading = false;

  selectedSaleToUpdate: SaleResponse | null = null;
  updateDraft: {
    sellerId: string;
    sellerName: string;
    tableId: string;
    tableName: string;
    locationId: string;
    details: CartItem[];
  } | null = null;

  isUpdatingSaleId: string | null = null;
  isCreatingSale = false;

  toasts: ToastMessage[] = [];

  salesPage = 1;
  salesPageSize = 5;
  salesPageSizeOptions = [5, 10, 20];

  private salesPollingStarted = false;
  private salesInitialLoadCompleted = false;
  private lastSalesErrorToastAt = 0;

  private readonly tableService = inject(TableService);

  constructor(
    private salesService: SalesService,
    private recipeService: RecipeService,
    private sellerTableService: SellerTableService,
    private cdr: ChangeDetectorRef,
    public env: EnvironmentService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;

    forkJoin([
      this.recipeService.getRecipes(),
      this.salesService.getSales(),
      this.sellerTableService.getSellers(),
      this.sellerTableService.getTables()
    ])
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ([recipes, sales, sellers, tables]) => {
          this.recipes = [...recipes];
          this.sales = this.normalizeAndSortSales(sales);
          this.applySaleFilters(false);

          this.sellers = [...sellers];
          this.tables = [...tables];

          if (!this.salesPollingStarted) {
            this.startSalesPolling();
          }
        },
        error: () => {
          this.showToast('error', 'No se pudieron cargar los datos de ventas.');
        }
      });
  }

  get filteredRecipes(): RecipeResponse[] {
    return this.getFilteredRecipes();
  }

  get filteredSellers(): Seller[] {
    const term = this.sellerQuery.trim().toLowerCase();

    return this.sellers.filter(
      seller =>
        this.sellerDisplayName(seller).toLowerCase().includes(term) ||
        this.sellerDocument(seller).toLowerCase().includes(term)
    );
  }

  get filteredTables(): RestaurantTable[] {
    const term = this.tableQuery.toLowerCase();

    return this.tables.filter(table =>
      this.tableDisplayName(table).toLowerCase().includes(term)
    );
  }

  get total(): number {
    return this.cartItems.reduce(
      (accumulator, item) => accumulator + item.quantity * item.unitPrice,
      0
    );
  }

  get totalSalesPages(): number {
    return Math.max(1, Math.ceil(this.filteredSales.length / this.salesPageSize));
  }

  get paginatedSales(): SaleResponse[] {
    const start = (this.salesPage - 1) * this.salesPageSize;
    return this.filteredSales.slice(start, start + this.salesPageSize);
  }

  get salesRangeStart(): number {
    return this.filteredSales.length ? (this.salesPage - 1) * this.salesPageSize + 1 : 0;
  }

  get salesRangeEnd(): number {
    return Math.min(this.salesPage * this.salesPageSize, this.filteredSales.length);
  }

  addToCart(recipe: RecipeResponse): void {
    if (!recipe.active || recipe.sellingPrice <= 0) {
      return;
    }

    const existingItem = this.cartItems.find(item => item.recipeId === recipe.id);

    if (existingItem) {
      this.cartItems = this.cartItems.map(item =>
        item.recipeId === recipe.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      this.cartItems = [
        ...this.cartItems,
        {
          recipeId: recipe.id,
          recipeName: recipe.name,
          lineDisplayName: recipe.name,
          quantity: 1,
          unitPrice: recipe.sellingPrice,
          recipeLineComment: 'Sin observaciones'
        }
      ];
    }

    this.cdr.markForCheck();
  }

  updateQty(id: string, qty: number): void {
    const quantity = Math.max(1, Number(qty) || 1);

    this.cartItems = this.cartItems.map(item =>
      item.recipeId === id ? { ...item, quantity } : item
    );

    this.cdr.markForCheck();
  }

  removeItem(id: string): void {
    this.cartItems = this.cartItems.filter(item => item.recipeId !== id);
    this.cdr.markForCheck();
  }

  openComment(item: CartItem): void {
    this.selectedCartRecipeId = item.recipeId;
    this.modalComment = item.recipeLineComment || 'Sin observaciones';
    this.showCommentModal = true;
  }

  saveComment(): void {
    const comment = this.modalComment.trim() || 'Sin observaciones';

    this.cartItems = this.cartItems.map(item =>
      item.recipeId === this.selectedCartRecipeId
        ? { ...item, recipeLineComment: comment }
        : item
    );

    this.showCommentModal = false;
    this.cdr.markForCheck();
  }

  completeSale(): void {
    if (this.isCreatingSale) {
      return;
    }

    if (!this.selectedSellerId) {
      this.showToast('error', 'Debes seleccionar un vendedor.');
      return;
    }

    if (!this.selectedTableId) {
      this.showToast('error', 'Debes seleccionar una mesa disponible.');
      return;
    }

    if (!this.cartItems.length) {
      this.showToast('error', 'Agrega al menos una receta a la venta.');
      return;
    }

    if (this.cartItems.some(item => !item.recipeId || item.quantity <= 0 || item.unitPrice <= 0)) {
      this.showToast('error', 'La cantidad y el precio unitario deben ser mayores que cero.');
      return;
    }

    const payload = {
      sellerId: this.selectedSellerId,
      locationId: this.getLocationId(),
      tableId: this.selectedTableId,
      details: this.cartItems.map(item => ({
        recipeId: item.recipeId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        recipeLineComment: item.recipeLineComment?.trim() || 'Sin observaciones',
        lineDisplayName: item.lineDisplayName || item.recipeName
      }))
    };

    this.isCreatingSale = true;
    this.cdr.markForCheck();

    this.salesService.createSale(payload)
      .pipe(
        finalize(() => {
          this.isCreatingSale = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: response => {
          this.showToast(
            'success',
            response?.message || 'Venta enviada a procesamiento correctamente.'
          );

          // Marcar la mesa como OCCUPIED abriendo una sesión
          const tableIdForSession = this.selectedTableId;
          if (tableIdForSession) {
            this.tableService.openSession(tableIdForSession, { guestCount: 1 }).pipe(
              catchError(() => of(null))
            ).subscribe(() => {
              this.refreshSales(true);
            });
          } else {
            this.refreshSales(true);
          }

          this.clearCurrentOrder();

          if (response?.saleId) {
            interval(2500)
              .pipe(
                take(4),
                switchMap(() => this.salesService.getSaleById(response.saleId))
              )
              .subscribe({
                next: () => this.refreshSales(true),
                error: () => {}
              });
          }
        },
        error: () => {
          this.showToast('error', 'No se pudo crear la venta.');
        }
      });
  }

  changeSalesPageSize(size: number): void {
    this.salesPageSize = Number(size);
    this.salesPage = 1;
    this.ensureValidSalesPage();
    this.cdr.markForCheck();
  }

  prevSalesPage(): void {
    if (this.salesPage > 1) {
      this.salesPage -= 1;
      this.cdr.markForCheck();
    }
  }

  nextSalesPage(): void {
    if (this.salesPage < this.totalSalesPages) {
      this.salesPage += 1;
      this.cdr.markForCheck();
    }
  }

  refreshSales(silent = false): void {
    this.salesService.getSales().subscribe({
      next: sales => {
        this.sales = this.normalizeAndSortSales(sales);
        this.applySaleFilters(false);
        this.cdr.markForCheck();
      },
      error: () => {
        if (!silent) {
          this.showToast('error', 'No se pudieron refrescar las ventas.');
        }
      }
    });
  }

  changeStatus(id: string, status: SaleStatus): void {
    this.salesService.patchSaleStatus(id, status).subscribe({
      next: () => {
        this.showToast('success', 'Actualización enviada a procesamiento.');
        this.refreshSales();
      },
      error: () => {
        this.showToast('error', 'No se pudo actualizar el estado.');
      }
    });
  }

  askDelete(id: string): void {
    this.deletingSaleId = id;
    this.showDeleteModal = true;
  }

  deleteSale(): void {
    const target = this.sales.find(sale => sale.id === this.deletingSaleId);

    if (target?.status === 'COMPLETED') {
      this.showDeleteModal = false;
      this.showToast('error', 'No se puede eliminar una venta completada.');
      this.cdr.markForCheck();
      return;
    }

    this.salesService.deleteSale(this.deletingSaleId).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.showToast('success', 'Eliminación enviada a procesamiento.');
        this.refreshSales();
      },
      error: () => {
        this.showToast('error', 'No se pudo eliminar la venta.');
      }
    });
  }

  openTraceModal(saleId: string): void {
    this.selectedTraceSaleId = saleId;
    this.showTraceModal = true;
    this.traceLoading = true;
    this.cdr.markForCheck();

    this.loadTrace(saleId, true);
  }

  closeTraceModal(): void {
    this.showTraceModal = false;
    this.selectedTraceSaleId = '';
    this.traceLoading = false;
    this.cdr.markForCheck();
  }

  loadTrace(id: string, refresh = true): void {
    if (!refresh && this.tracesBySaleId[id]) {
      this.traceLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.salesService.getSalePreparations(id).subscribe({
      next: traces => {
        this.tracesBySaleId = {
          ...this.tracesBySaleId,
          [id]: [...traces]
        };

        this.traceLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.traceLoading = false;
        this.showToast('error', 'No se pudo cargar la trazabilidad.');
        this.cdr.markForCheck();
      }
    });
  }

  pickSeller(seller: Seller): void {
    this.selectedSellerId = seller.id;
    this.selectedSellerName = this.sellerDisplayName(seller);
    this.showSellerModal = false;
  }

  tableAvailable(table: RestaurantTable): boolean {
    const status = (table.status || '').toUpperCase();

    // Si la mesa está ocupada o inactiva, no está disponible
    if (['OCCUPIED', 'OCUPADA', 'BUSY', 'IN_USE', 'INACTIVE'].includes(status)) {
      return false;
    }

    // Si explícitamente dice que está ocupada o inactiva
    if (table.occupied === true || table.active === false) {
      return false;
    }

    // Si está disponible o libre, está disponible
    if (['AVAILABLE', 'DISPONIBLE', 'FREE', 'LIBRE', 'ACTIVE'].includes(status)) {
      return true;
    }

    // Por defecto, si canOpenNow es true, está disponible
    return table.canOpenNow === true || table.available === true;
  }

  pickTable(table: RestaurantTable): void {
    if (!this.tableAvailable(table)) {
      return;
    }

    this.selectedTableId = table.id;
    this.selectedTableName = this.tableDisplayName(table);
    this.showTableModal = false;
  }

  openUpdateSaleModal(sale: SaleResponse): void {
    if (sale.status === 'COMPLETED') {
      this.showToast('error', 'No se puede actualizar una venta completada.');
      return;
    }

    const seller = this.sellers.find(item => item.id === sale.sellerId);
    const table = this.tables.find(item => item.id === sale.tableId);
    const details = sale.details ?? [];

    this.selectedSaleToUpdate = sale;

    this.updateDraft = {
      sellerId: sale.sellerId,
      sellerName: seller ? this.sellerDisplayName(seller) : 'Vendedor sin nombre',
      tableId: sale.tableId,
      tableName: table ? this.tableDisplayName(table) : 'Mesa sin nombre',
      locationId: sale.locationId || this.getLocationId(),
      details: details.map(detail => ({
        recipeId: detail.recipeId,
        recipeName: detail.lineDisplayName || this.recipeNameById(detail.recipeId),
        lineDisplayName: detail.lineDisplayName || this.recipeNameById(detail.recipeId),
        quantity: detail.quantity,
        unitPrice: detail.unitPrice,
        recipeLineComment: detail.recipeLineComment || 'Sin observaciones'
      }))
    };

    this.showUpdateModal = true;
    this.cdr.markForCheck();
  }

  closeUpdateSaleModal(): void {
    this.showUpdateModal = false;
    this.selectedSaleToUpdate = null;
    this.updateDraft = null;
    this.cdr.markForCheck();
  }

  updateDraftQty(recipeId: string, qty: number): void {
    if (!this.updateDraft) {
      return;
    }

    const quantity = Math.max(1, Number(qty) || 1);

    this.updateDraft = {
      ...this.updateDraft,
      details: this.updateDraft.details.map(item =>
        item.recipeId === recipeId ? { ...item, quantity } : item
      )
    };

    this.cdr.markForCheck();
  }

  updateDraftUnitPrice(recipeId: string, unitPrice: number): void {
    if (!this.updateDraft) {
      return;
    }

    const price = Math.max(1, Number(unitPrice) || 1);

    this.updateDraft = {
      ...this.updateDraft,
      details: this.updateDraft.details.map(item =>
        item.recipeId === recipeId ? { ...item, unitPrice: price } : item
      )
    };

    this.cdr.markForCheck();
  }

  updateDraftComment(recipeId: string, value: string): void {
    if (!this.updateDraft) {
      return;
    }

    this.updateDraft = {
      ...this.updateDraft,
      details: this.updateDraft.details.map(item =>
        item.recipeId === recipeId
          ? { ...item, recipeLineComment: value }
          : item
      )
    };

    this.cdr.markForCheck();
  }

  removeUpdateDraftItem(recipeId: string): void {
    if (!this.updateDraft) {
      return;
    }

    this.updateDraft = {
      ...this.updateDraft,
      details: this.updateDraft.details.filter(item => item.recipeId !== recipeId)
    };

    this.cdr.markForCheck();
  }

  updateDraftTotal(): number {
    return (this.updateDraft?.details ?? []).reduce(
      (accumulator, item) => accumulator + item.quantity * item.unitPrice,
      0
    );
  }

  submitSaleUpdate(): void {
    if (!this.selectedSaleToUpdate || !this.updateDraft || this.isUpdatingSaleId) {
      return;
    }

    if (this.selectedSaleToUpdate.status === 'COMPLETED') {
      this.showToast('error', 'No se puede actualizar una venta completada.');
      return;
    }

    if (!this.validateUpdateDraft()) {
      return;
    }

    const payload = {
      sellerId: this.updateDraft.sellerId,
      locationId: this.updateDraft.locationId,
      tableId: this.updateDraft.tableId,
      details: this.updateDraft.details.map(item => ({
        recipeId: item.recipeId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        recipeLineComment: item.recipeLineComment?.trim() || 'Sin observaciones',
        lineDisplayName: item.lineDisplayName || item.recipeName
      }))
    };

    this.isUpdatingSaleId = this.selectedSaleToUpdate.id;
    this.cdr.markForCheck();

    this.salesService.updateSale(this.selectedSaleToUpdate.id, payload)
      .pipe(
        finalize(() => {
          this.isUpdatingSaleId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: response => {
          this.showToast(
            'success',
            response?.message || 'Actualización enviada a procesamiento correctamente.'
          );

          this.closeUpdateSaleModal();
          this.refreshSales(true);
        },
        error: () => {
          this.showToast('error', 'No se pudo actualizar la venta.');
        }
      });
  }

  saleLabel(id: string): string {
    return `#${id.slice(-6).toUpperCase()}`;
  }

  recipeNameById(id: string): string {
    return this.recipes.find(recipe => recipe.id === id)?.name ?? 'Receta no encontrada';
  }

  sellerDocument(seller: Seller): string {
    const candidates = [
      seller.document,
      seller.identificationNumber,
      (seller as any).identification_number,
      (seller as any).documentNumber,
      (seller as any).document_number,
      (seller as any).identification,
      (seller as any).identificationNumber,
      (seller as any).identification_number_id,
      (seller as any).identificationNumberId,
      seller.phone
    ];

    for (const candidate of candidates) {
      const value = String(candidate ?? '').trim();

      if (!value) {
        continue;
      }

      if (this.looksLikeUuid(value)) {
        continue;
      }

      return value;
    }

    return 'Sin documento';
  }

  sellerDisplayName(seller: Seller): string {
    return (
      seller.fullName ||
      seller.name ||
      `${seller.firstName ?? ''} ${seller.lastName ?? ''}`.trim() ||
      `${(seller as any).first_name ?? ''} ${(seller as any).last_name ?? ''}`.trim() ||
      seller.email ||
      this.sellerDocument(seller) ||
      seller.phone ||
      'Vendedor sin nombre'
    );
  }

  tableDisplayName(table: RestaurantTable): string {
    const number = table.number ?? table.tableNumber;

    return (
      table.displayName ||
      table.name ||
      table.tableName ||
      (number ? `Mesa ${number}` : table.code) ||
      'Mesa sin nombre'
    );
  }

  saleStatusLabel(status: SaleStatus): string {
    return (
      {
        CREATED: 'Creada',
        IN_PROGRESS: 'En proceso',
        COMPLETED: 'Completada',
        CANCELLED: 'Cancelada'
      }[status] || status
    );
  }

  traceStatusLabel(status: string): string {
    return status === 'ACCEPTED' ? 'Aceptada' : 'Rechazada';
  }

  trackBySaleId(_: number, sale: SaleResponse): string {
    return sale.id;
  }

  traceRecipeName(trace: RecipePreparationTrace): string {
    const fromCatalog = this.recipes.find(recipe => recipe.id === trace.recipeId)?.name;

    if (fromCatalog) {
      return fromCatalog;
    }

    const selectedSale = this.sales.find(sale => sale.id === this.selectedTraceSaleId);
    const fromSaleLine = selectedSale?.details?.find(detail => detail.recipeId === trace.recipeId)?.lineDisplayName;

    return fromSaleLine || 'Receta no encontrada';
  }

  activeTraceSaleLabel(): string {
    return this.selectedTraceSaleId ? this.saleLabel(this.selectedTraceSaleId) : '';
  }

  activeTraceItems(): RecipePreparationTrace[] {
    return this.selectedTraceSaleId
      ? this.tracesBySaleId[this.selectedTraceSaleId] ?? []
      : [];
  }

  commentRecipeName(): string {
    return this.cartItems.find(item => item.recipeId === this.selectedCartRecipeId)?.recipeName || 'receta';
  }

  showToast(type: ToastType, message: string, duration = 4500): void {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const toast: ToastMessage = {
      id,
      type,
      message,
      duration
    };

    this.toasts = [...this.toasts, toast];

    window.setTimeout(() => {
      this.removeToast(toast.id);
    }, toast.duration);

    this.cdr.markForCheck();
  }


  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  trackByToastId(_: number, toast: ToastMessage): string {
    return toast.id;
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.cdr.markForCheck();
  }

  applyRecipeFilters(): void {
    this.cdr.markForCheck();
  }

  clearRecipeFilters(): void {
    this.recipeSearchTerm = '';
    this.recipeStatusFilter = 'ALL';
    this.recipeMinPrice = null;
    this.recipeMaxPrice = null;
    this.recipeSort = 'NAME_ASC';
    this.cdr.markForCheck();
  }

  applySaleFilters(resetPage = true): void {
    const term = this.saleSearchTerm.trim().toLowerCase();
    const fromDate = this.saleDateFrom ? new Date(`${this.saleDateFrom}T00:00:00`).getTime() : null;
    const toDate = this.saleDateTo ? new Date(`${this.saleDateTo}T23:59:59.999`).getTime() : null;
    const currentLocationId = this.getLocationId();

    this.filteredSales = this.sales.filter(sale => {

      if (currentLocationId && sale.locationId && sale.locationId !== currentLocationId) {
        return false;
      }

      const saleCode = this.saleLabel(sale.id).replace('#', '').toLowerCase();
      const saleDate = new Date(sale.createdDate || sale.modifiedDate || 0).getTime();
      const total = sale.totalAmount || 0;

      if (term && !saleCode.includes(term)) {
        return false;
      }

      if (this.saleStatusFilter !== 'ALL' && sale.status !== this.saleStatusFilter) {
        return false;
      }

      if (fromDate && saleDate < fromDate) {
        return false;
      }

      if (toDate && saleDate > toDate) {
        return false;
      }

      if (this.saleMinTotal !== null && total < this.saleMinTotal) {
        return false;
      }

      if (this.saleMaxTotal !== null && total > this.saleMaxTotal) {
        return false;
      }

      return true;
    });

    if (resetPage) {
      this.salesPage = 1;
    }

    this.ensureValidSalesPage();
    this.cdr.markForCheck();
  }

  clearSaleFilters(): void {
    this.saleSearchTerm = '';
    this.saleStatusFilter = 'ALL';
    this.saleDateFrom = null;
    this.saleDateTo = null;
    this.saleMinTotal = null;
    this.saleMaxTotal = null;
    this.applySaleFilters();
  }

  private validateUpdateDraft(): boolean {
    if (!this.updateDraft?.sellerId) {
      this.showToast('error', 'Debes seleccionar un vendedor.');
      return false;
    }

    if (!this.updateDraft?.tableId) {
      this.showToast('error', 'Debes seleccionar una mesa disponible.');
      return false;
    }

    if (!this.updateDraft.details.length) {
      this.showToast('error', 'La venta debe tener al menos una receta.');
      return false;
    }

    if (this.updateDraft.details.some(item => item.quantity <= 0)) {
      this.showToast('error', 'La cantidad debe ser mayor que cero.');
      return false;
    }

    if (this.updateDraft.details.some(item => item.unitPrice <= 0)) {
      this.showToast('error', 'El precio unitario debe ser mayor que cero.');
      return false;
    }

    return true;
  }

  private clearCurrentOrder(): void {
    this.cartItems = [];
    this.selectedCartRecipeId = '';
    this.modalComment = 'Sin observaciones';
    this.cdr.markForCheck();
  }

  private getFilteredRecipes(): RecipeResponse[] {
    const term = this.recipeSearchTerm.trim().toLowerCase();
    const minPrice = this.recipeMinPrice ?? null;
    const maxPrice = this.recipeMaxPrice ?? null;

    return [...this.recipes]
      .filter(recipe => {
        const name = (recipe.name || '').toLowerCase();
        const price = recipe.sellingPrice || 0;

        if (!recipe.visibleInMenu) {
          return false;
        }

        if (term && !name.includes(term)) {
          return false;
        }

        if (this.recipeStatusFilter === 'ACTIVE' && !recipe.active) {
          return false;
        }

        if (this.recipeStatusFilter === 'INACTIVE' && recipe.active) {
          return false;
        }

        if (minPrice !== null && price < minPrice) {
          return false;
        }

        if (maxPrice !== null && price > maxPrice) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (this.recipeSort === 'NAME_DESC') {
          return (b.name || '').localeCompare(a.name || '');
        }

        if (this.recipeSort === 'PRICE_ASC') {
          return (a.sellingPrice || 0) - (b.sellingPrice || 0);
        }

        if (this.recipeSort === 'PRICE_DESC') {
          return (b.sellingPrice || 0) - (a.sellingPrice || 0);
        }

        return (a.name || '').localeCompare(b.name || '');
      });
  }

  private normalizeAndSortSales(sales: SaleResponse[]): SaleResponse[] {
    return [...sales].sort((a, b) => {
      const dateA = new Date(a.modifiedDate || a.createdDate || 0).getTime();
      const dateB = new Date(b.modifiedDate || b.createdDate || 0).getTime();

      return dateB - dateA;
    });
  }

  private ensureValidSalesPage(): void {
    const maxPage = this.totalSalesPages;

    if (this.salesPage > maxPage) {
      this.salesPage = maxPage;
    }

    if (this.salesPage < 1) {
      this.salesPage = 1;
    }
  }

  private startSalesPolling(): void {
    this.salesPollingStarted = true;

    timer(0, 10000)
      .pipe(
        switchMap(() =>
          forkJoin({
            sales: this.salesService.getSales(),
            tables: this.sellerTableService.getTables()
          }).pipe(
            catchError(() => {
              const now = Date.now();

              if (!this.salesInitialLoadCompleted || now - this.lastSalesErrorToastAt > 45000) {
                this.lastSalesErrorToastAt = now;
                this.showToast('error', 'No se pudieron refrescar los datos de ventas y mesas.');
              }

              return EMPTY;
            })
          )
        )
      )
      .subscribe(({ sales, tables }) => {
        this.sales = this.normalizeAndSortSales(sales);
        this.tables = [...tables];
        this.applySaleFilters(false);
        this.salesInitialLoadCompleted = true;
        this.cdr.markForCheck();
      });
  }

  private getLocationId(): string {
    return this.env.locationId;
  }
}