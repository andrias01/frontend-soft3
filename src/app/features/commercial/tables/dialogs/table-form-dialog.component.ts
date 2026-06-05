import { Component, computed, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TableDTO } from '../models/table.models';
import { DEFAULT_TABLE_VENUE_ID } from '../utils/table.constants';
import { AuthService } from '@features/user/services/auth.service';

@Component({
  selector: 'eatup-table-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="cancel.emit()">
        <form class="dialog" [formGroup]="form" (ngSubmit)="submit()" (click)="$event.stopPropagation()">
          <header>
            <div>
              <span>Mesa</span>
              <h2>{{ title() }}</h2>
            </div>
            <button type="button" class="icon-btn" (click)="cancel.emit()" aria-label="Cerrar">×</button>
          </header>

          <div class="grid">
            <label>
              Número
              <input type="number" formControlName="tableNumber" min="1" max="2147483647" />
              @if (form.controls.tableNumber.invalid && form.controls.tableNumber.touched) {
                <small>Ingresa un número válido entre 1 y 2147483647.</small>
              }
            </label>

            <label>
              Ubicación
              <input type="text" formControlName="location" placeholder="Salón principal" maxlength="100" />
              @if (form.controls.location.invalid && form.controls.location.touched) {
                <small>La ubicación es obligatoria (mínimo 2, máximo 100 caracteres).</small>
              }
            </label>

            <label>
              Venue ID
              <input type="text" formControlName="venueId" />
              @if (form.controls.venueId.invalid && form.controls.venueId.touched) {
                <small>El Venue ID es obligatorio.</small>
              }
            </label>
          </div>

          <div class="checks">
            <label><input type="checkbox" formControlName="isVip" /> VIP</label>
            <label><input type="checkbox" formControlName="hasView" /> Con vista</label>
          </div>

          <footer>
            <button type="button" class="secondary" (click)="cancel.emit()">Cancelar</button>
            <button type="submit" class="primary" [disabled]="form.invalid">Guardar mesa</button>
          </footer>
        </form>
      </div>
    }
  `,
  styleUrl: './dialog-form.css',
})
export class TableFormDialogComponent {
  private readonly fb = new FormBuilder().nonNullable;
  private readonly authService = inject(AuthService);

  readonly open = input(false);
  readonly table = input<TableDTO | null>(null);
  readonly save = output<TableDTO>();
  readonly cancel = output<void>();

  readonly title = computed(() => (this.table()?.id ? 'Editar mesa' : 'Crear mesa'));

  readonly form = this.fb.group({
    id: [''],
    tableNumber: [1, [Validators.required, Validators.min(1), Validators.max(2147483647)]],
    location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    venueId: [this.currentVenueId(), Validators.required],
    isVip: [false],
    hasView: [false],
  });

  ngOnChanges(): void {
    const table = this.table();
    if (table) {
      this.form.patchValue({
        id: table.id ?? '',
        tableNumber: table.tableNumber,
        location: table.location,
        venueId: table.venueId,
        isVip: table.isVip ?? false,
        hasView: table.hasView ?? false,
      });
    } else {
      this.form.reset({
        id: '',
        tableNumber: 1,
        location: '',
        venueId: this.currentVenueId(),
        isVip: false,
        hasView: false,
      });
    }
  }

    private currentVenueId(): string {
    return this.authService.getLocationId() || DEFAULT_TABLE_VENUE_ID;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.getRawValue() as TableDTO);
  }
}