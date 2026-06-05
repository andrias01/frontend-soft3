import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CreateTransferRequest } from '../../models/transfer.model';
import { TransferService } from '../../services/transfer.service';
import { TransferReferenceDataService } from '../../services/transfer-reference-data.service';
import { UserProfileService } from '@features/user/services/user-profile.service';
import { ProductResponse } from '@features/inventory/product/models/product.model';
import { LocationResponse } from '@features/inventory/location/models/location.model';

interface TransferProductLine {
  productName: string;
  quantity: number;
  stock: number;
  unitOfMeasure: string;
}

@Component({
  selector: 'app-transfer-create-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <a class="back-link" routerLink="..">Volver a traslados</a>
          <p class="eyebrow">Inventory / Transfer</p>
          <h1>Crear traslado</h1>
          <p>
            Programa una salida entre sedes y deja listo el flujo para que origen gestione
            transito o cancelacion desde el tablero.
          </p>
        </div>
      </div>

      <div class="form-layout">
        <form class="form-card" (ngSubmit)="submit()">
          <div class="section-grid">
            <div class="field">
              <label for="sedeOrigen">Sede origen</label>
              <div class="locked-field">
                <span>{{ currentLocationLabel() }}</span>
                <small>Sede autenticada del usuario</small>
              </div>
              <small>Se precarga con la sede autenticada del usuario.</small>
            </div>

            <div class="field">
              <label for="sedeDestino">Sede destino</label>
              <select
                id="sedeDestino"
                class="input"
                [(ngModel)]="form.sedeDestino"
                name="sedeDestino"
                required>
                <option value="" disabled>Selecciona la sede destino</option>
                @for (location of destinationLocations(); track location.id) {
                  <option [value]="location.id" [disabled]="!location.active">
                    {{ destinationLabel(location) }}
                  </option>
                }
              </select>
              <small>Elige la sede por nombre y ciudad; las inactivas quedan deshabilitadas.</small>
            </div>

            <div class="field">
              <label for="fechaEnvio">Fecha de envio</label>
              <input
                id="fechaEnvio"
                type="datetime-local"
                class="input"
                [(ngModel)]="form.fechaEnvio"
                name="fechaEnvio"
                required>
            </div>

            <div class="field">
              <label for="fechaLlegada">Fecha de llegada</label>
              <input
                id="fechaLlegada"
                type="datetime-local"
                class="input"
                [(ngModel)]="form.fechaLlegada"
                name="fechaLlegada"
                required>
            </div>

            <div class="field">
              <label for="responsable">Responsable</label>
              <input
                id="responsable"
                type="text"
                class="input"
                [(ngModel)]="form.responsable"
                name="responsable"
                required
                placeholder="Digita el nombre del responsable">
              <small>Digita el nombre de la persona responsable del traslado.</small>
            </div>

            <div class="field">
              <label for="producto">Producto</label>
              <select
                id="producto"
                class="input"
                [(ngModel)]="form.producto"
                name="producto"
                [disabled]="loadingContext() || !productOptions().length">
                <option value="" disabled>Selecciona el producto</option>
                @for (product of productOptions(); track product.id) {
                  <option [value]="product.id">
                    {{ productLabel(product) }}
                  </option>
                }
              </select>
              <small>Solo se listan productos de la sede origen.</small>
            </div>

            <div class="field">
              <label for="cantidad">Cantidad</label>
              <input
                id="cantidad"
                type="number"
                class="input"
                [(ngModel)]="form.cantidad"
                name="cantidad"
                min="1">
            </div>
          </div>

          <div class="product-actions">
            <button
              class="btn-add"
              type="button"
              [disabled]="!canAddProductLine()"
              (click)="addProductLine()">
              Agregar producto
            </button>
          </div>

          @if (productLines().length) {
            <div class="product-lines">
              <div class="product-lines-header">
                <span>Productos del traslado</span>
                <strong>{{ productLines().length }}</strong>
              </div>

              @for (line of productLines(); track line.productName) {
                <div class="product-line">
                  <div>
                    <strong>{{ line.productName }}</strong>
                    <small>Disponible: {{ line.stock }} {{ line.unitOfMeasure }}</small>
                  </div>
                  <span>{{ line.quantity }} {{ line.unitOfMeasure }}</span>
                  <button type="button" class="btn-remove" (click)="removeProductLine(line.productName)">
                    Quitar
                  </button>
                </div>
              }
            </div>
          }

          <div class="field field-full">
            <label for="observaciones">Observaciones</label>
            <textarea
              id="observaciones"
              class="input textarea"
              [(ngModel)]="form.observaciones"
              name="observaciones"
              rows="4"
              placeholder="Notas opcionales del traslado"></textarea>
          </div>

          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          @if (successMessage()) {
            <div class="alert-success">{{ successMessage() }}</div>
          }

          <div class="action-row">
            <button class="btn-primary" type="submit" [disabled]="submitting() || !isFormValid()">
              {{ submitting() ? 'Creando...' : 'Crear traslado' }}
            </button>
            <a class="btn-ghost" routerLink="..">Cancelar</a>
          </div>
        </form>

        <aside class="guide-card">
          <h2>Reglas del flujo</h2>
          <ul>
            <li>Origen puede pasar a <strong>EN_TRANSITO</strong> o <strong>CANCELADO</strong>.</li>
            <li>Destino puede <strong>COMPLETAR</strong> o <strong>RECLAMAR</strong>.</li>
            <li>El backend valida sede y estado con el flujo real que ya probaste.</li>
          </ul>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .page-shell { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header {
      background: linear-gradient(135deg, var(--color-background) 0%, #fff 100%);
      border: 1px solid #f1e3d7;
      border-radius: 1rem;
      padding: 1.5rem;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 0.75rem;
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 600;
    }
    .eyebrow {
      margin: 0 0 0.4rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.75rem;
      color: #94a3b8;
    }
    h1 { margin: 0; color: var(--color-secondary); font-size: 2rem; }
    .page-header p:last-child { margin: 0.75rem 0 0; color: #64748b; max-width: 720px; }
    .form-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
      gap: 1.5rem;
      align-items: start;
    }
    .form-card, .guide-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 1px 6px rgba(0,0,0,0.04);
    }
    .section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.45rem; margin-bottom: 1rem; }
    .field-full { margin-bottom: 1rem; }
    label { font-size: 0.875rem; font-weight: 700; color: #334155; }
    small { color: #64748b; }
    .input {
      border: 1px solid #cbd5e1;
      border-radius: 0.75rem;
      padding: 0.8rem 0.9rem;
      font: inherit;
      color: #0f172a;
      background: #fff;
    }
    .input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(255,107,53,0.2);
    }
    .locked-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.85rem 0.9rem;
      background: #f8fafc;
    }
    .locked-field span {
      font-weight: 700;
      color: #0f172a;
    }
    .locked-field small {
      word-break: break-all;
      font-size: 0.8rem;
      color: #64748b;
    }
    .textarea { resize: vertical; min-height: 120px; }
    .product-actions { display: flex; justify-content: flex-start; margin: -0.25rem 0 1rem; }
    .btn-add {
      border: 1px solid #fed7aa;
      border-radius: 0.75rem;
      background: #fff7ed;
      color: var(--color-primary);
      cursor: pointer;
      font-weight: 800;
      padding: 0.7rem 1rem;
    }
    .btn-add:disabled { opacity: 0.55; cursor: not-allowed; }
    .product-lines {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f8fafc;
    }
    .product-lines-header {
      display: flex;
      justify-content: space-between;
      color: #334155;
      font-weight: 800;
    }
    .product-line {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 1rem;
      align-items: center;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      background: white;
      padding: 0.8rem 0.9rem;
    }
    .product-line div { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
    .product-line strong { color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .product-line span { color: #334155; font-weight: 800; }
    .btn-remove {
      border: 1px solid #fecaca;
      border-radius: 0.65rem;
      background: #fef2f2;
      color: #b91c1c;
      cursor: pointer;
      font-weight: 800;
      padding: 0.45rem 0.75rem;
    }
    .action-row { display: flex; gap: 1rem; align-items: center; margin-top: 1rem; }
    .btn-primary, .btn-ghost {
      border-radius: 0.75rem;
      padding: 0.75rem 1.2rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
    }
    .btn-primary { background: var(--color-primary); color: white; box-shadow: 0 2px 8px rgba(234, 88, 12, 0.25); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-ghost { background: transparent; color: var(--color-primary); }
    .alert-error, .alert-success {
      border-radius: 0.8rem;
      padding: 0.9rem 1rem;
      margin-top: 0.75rem;
    }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
    .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .guide-card h2 { margin-top: 0; color: var(--color-secondary); }
    .guide-card ul { margin: 1rem 0 0; padding-left: 1.2rem; color: #475569; display: grid; gap: 0.9rem; }
    @media (max-width: 960px) {
      .form-layout { grid-template-columns: 1fr; }
      .section-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TransferCreatePageComponent {
  private readonly transferService = inject(TransferService);
  private readonly router = inject(Router);
  private readonly userProfileService = inject(UserProfileService);
  private readonly referenceDataService = inject(TransferReferenceDataService);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly loadingContext = signal(true);
  protected readonly destinationLocations = signal<LocationResponse[]>([]);
  protected readonly productOptions = signal<ProductResponse[]>([]);
  protected readonly productLines = signal<TransferProductLine[]>([]);
  protected readonly currentLocationId = signal<string>('');
  protected readonly currentLocationLabel = signal('Sede autenticada');

  protected readonly form = {
    sedeOrigen: '',
    sedeDestino: '',
    fechaEnvio: '',
    fechaLlegada: '',
    responsable: '',
    producto: '',
    cantidad: 1,
    observaciones: ''
  };

  async ngOnInit(): Promise<void> {
    await this.loadCurrentLocation();
  }

  protected isFormValid(): boolean {
    return Boolean(
      this.form.sedeOrigen.trim() &&
      this.form.sedeDestino.trim() &&
      this.form.fechaEnvio &&
      this.form.fechaLlegada &&
      this.form.responsable.trim() &&
      this.productLines().length > 0
    );
  }

  protected canAddProductLine(): boolean {
    return !!this.selectedProduct()
      && this.form.cantidad > 0
      && this.form.cantidad <= (this.selectedProduct()?.stock ?? 0);
  }

  protected addProductLine(): void {
    const product = this.selectedProduct();
    if (!product || !this.canAddProductLine()) {
      return;
    }

    const quantity = Number(this.form.cantidad);
    this.productLines.update(lines => {
      const existing = lines.find(line => line.productName === product.name);
      if (existing) {
        return lines.map(line =>
          line.productName === product.name
            ? { ...line, quantity }
            : line
        );
      }

      return [
        ...lines,
        {
          productName: product.name,
          quantity,
          stock: product.stock,
          unitOfMeasure: product.unitOfMeasure
        }
      ];
    });

    this.form.producto = '';
    this.form.cantidad = 1;
  }

  protected removeProductLine(productName: string): void {
    this.productLines.update(lines => lines.filter(line => line.productName !== productName));
  }

  protected submit(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    const basePayload = {
      sedeOrigen: this.currentLocationId() || this.form.sedeOrigen.trim(),
      sedeDestino: this.form.sedeDestino.trim(),
      fechaEnvio: this.toIsoLocal(this.form.fechaEnvio),
      fechaLlegada: this.toIsoLocal(this.form.fechaLlegada),
      responsable: this.form.responsable.trim(),
      observaciones: this.form.observaciones.trim() || undefined
    };

    const requests = this.productLines().map(line => {
      const payload: CreateTransferRequest = {
        ...basePayload,
        producto: line.productName,
        cantidad: line.quantity
      };
      return this.transferService.create(payload);
    });

    forkJoin(requests).subscribe({
      next: transfers => {
        this.submitting.set(false);
        const message = transfers.length === 1
          ? `Traslado #${transfers[0].idTraslado} creado correctamente.`
          : `${transfers.length} traslados creados correctamente.`;
        this.successMessage.set(message);
        const route = transfers.length === 1
          ? ['/inventory/transfer', transfers[0].idTraslado]
          : ['/inventory/transfer'];
        setTimeout(() => this.router.navigate(route), 1200);
      },
      error: err => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'No fue posible crear el traslado.');
      }
    });
  }

  private toIsoLocal(value: string): string {
    return value.length === 16 ? `${value}:00` : value;
  }

  private async loadCurrentLocation(): Promise<void> {
    this.loadingContext.set(true);

    try {
      const profile = await this.userProfileService.loadProfileData();
      const currentLocationId = profile.editable.locationId || '';
      this.currentLocationId.set(currentLocationId);
      this.form.sedeOrigen = currentLocationId;
      this.currentLocationLabel.set(
        profile.locations.find(location => location.id === currentLocationId)?.name || 'Sede autenticada'
      );
      this.destinationLocations.set([]);
      await this.loadReferenceData(currentLocationId);
    } catch {
      this.error.set('No se pudo cargar la sede del usuario autenticado.');
    } finally {
      this.loadingContext.set(false);
    }
  }

  private async loadReferenceData(locationId: string): Promise<void> {
    const [productsResult, locationsResult] = await Promise.allSettled([
      this.referenceDataService.loadProductsByLocation(locationId),
      this.referenceDataService.loadSelectableLocations()
    ]);

    if (productsResult.status === 'fulfilled') {
      this.productOptions.set(productsResult.value);
    } else {
      const currentError = this.error();
      this.error.set(
        currentError
          ? `${currentError} No se pudo cargar el catalogo de productos.`
          : 'No se pudo cargar el catalogo de productos.'
      );
    }

    if (locationsResult.status === 'fulfilled') {
      this.destinationLocations.set(
        locationsResult.value.filter(location => location.id !== locationId)
      );
    } else {
      const currentError = this.error();
      this.error.set(
        currentError
          ? `${currentError} No se pudo cargar el catalogo de sedes.`
          : 'No se pudo cargar el catalogo de sedes.'
      );
    }
  }

  protected productLabel(product: ProductResponse): string {
    return `${product.name} — ${product.stock} ${product.unitOfMeasure}`;
  }

  private selectedProduct(): ProductResponse | undefined {
    return this.productOptions().find(product => product.id === this.form.producto);
  }

  protected destinationLabel(location: LocationResponse): string {
    return `${location.name} - ${location.city}${location.active ? '' : ' (Inactiva)'}`;
  }
}
