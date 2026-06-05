import { Component, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ReservationStatus } from '../models/table.enums';
import { TableReservationDTO } from '../models/table.models';

@Component({
  selector: 'eatup-reservation-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="cancel.emit()">
        <form class="dialog" [formGroup]="form" (ngSubmit)="submit()" (click)="$event.stopPropagation()">
          <header>
            <div>
              <span>Reserva</span>
              <h2>{{ reservation()?.id ? 'Editar reserva' : 'Crear reserva' }}</h2>
            </div>
            <button type="button" class="icon-btn" (click)="cancel.emit()" aria-label="Cerrar">×</button>
          </header>

          <div class="grid">
            <label>
              Nombre
              <input formControlName="guestName" maxlength="100" />
              @if (form.controls.guestName.invalid && form.controls.guestName.touched) {
                <small>El nombre es obligatorio (mínimo 2, máximo 100 caracteres).</small>
              }
            </label>
            <label>
              Documento
              <input formControlName="guestDocumentNumber" inputmode="numeric" (keypress)="soloNumeros($event)" maxlength="50" />
              @if (form.controls.guestDocumentNumber.invalid && form.controls.guestDocumentNumber.touched) {
                <small>Ingresa un documento válido (solo números, mínimo 4 dígitos).</small>
              }
            </label>
            <label>
              Invitados
              <input type="number" min="1" formControlName="guestCount" />
              @if (form.controls.guestCount.invalid && form.controls.guestCount.touched) {
                <small>Ingresa al menos un invitado.</small>
              }
            </label>
            <label>
              Fecha
              <input type="date" formControlName="reservationDate" />
              @if (form.controls.reservationDate.invalid && form.controls.reservationDate.touched) {
                <small>La fecha es obligatoria.</small>
              }
            </label>
            <label>
              Hora
              <input type="time" formControlName="reservationTime" />
              @if (form.controls.reservationTime.invalid && form.controls.reservationTime.touched) {
                <small>La hora es obligatoria.</small>
              }
            </label>
          </div>

          <footer>
            <button type="button" class="secondary" (click)="cancel.emit()">Cancelar</button>
            <button type="submit" class="primary" [disabled]="form.invalid">Guardar reserva</button>
          </footer>
        </form>
      </div>
    }
  `,
  styleUrl: './dialog-form.css',
})
export class ReservationFormDialogComponent {
  private readonly fb = new FormBuilder().nonNullable;

  readonly open = input(false);
  readonly reservation = input<TableReservationDTO | null>(null);
  readonly tableId = input<string>('');
  readonly save = output<TableReservationDTO>();
  readonly cancel = output<void>();

  readonly form = this.fb.group({
    id: [''],
    tableId: [''],
    guestName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    guestDocumentNumber: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50), Validators.pattern('^[0-9]*$')]],
    guestCount: [2, [Validators.required, Validators.min(1)]],
    reservationDate: [new Date().toISOString().slice(0, 10), Validators.required],
    reservationTime: ['19:00', Validators.required],
    status: [ReservationStatus.PENDING],
  });

  ngOnChanges(): void {
    const reservation = this.reservation();
    this.form.patchValue({
      id: reservation?.id ?? '',
      tableId: reservation?.tableId ?? this.tableId(),
      guestName: reservation?.guestName ?? '',
      guestDocumentNumber: reservation?.guestDocumentNumber ?? '',
      guestCount: reservation?.guestCount ?? 2,
      reservationDate: reservation?.reservationDate ?? new Date().toISOString().slice(0, 10),
      reservationTime: reservation?.reservationTime ?? '19:00',
      status: reservation?.status ?? ReservationStatus.PENDING,
    });
  }

  soloNumeros(event: KeyboardEvent): boolean {
    return /[0-9]/.test(event.key);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.getRawValue());
  }
}