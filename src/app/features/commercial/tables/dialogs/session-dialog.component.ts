import { Component, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'eatup-session-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (open()) {
      <div class="backdrop" (click)="cancel.emit()">
        <form class="dialog" [formGroup]="form" (ngSubmit)="submit()" (click)="$event.stopPropagation()">
          <header>
            <div>
              <span>Sesión</span>
              <h2>{{ title() }}</h2>
            </div>
            <button type="button" class="icon-btn" (click)="cancel.emit()" aria-label="Cerrar">×</button>
          </header>

          <label>
            Invitados
            <input type="number" min="1" formControlName="guestCount" />
            @if (form.controls.guestCount.invalid && form.controls.guestCount.touched) {
              <small>Ingresa al menos un invitado.</small>
            }
          </label>

          <label>
            Observaciones
            <textarea rows="4" formControlName="observations" placeholder="Notas para el equipo" maxlength="500"></textarea>
            @if (form.controls.observations.invalid && form.controls.observations.touched) {
              <small>Las observaciones no pueden superar los 500 caracteres.</small>
            }
          </label>

          <footer>
            <button type="button" class="secondary" (click)="cancel.emit()">Cancelar</button>
            <button type="submit" class="primary" [disabled]="form.invalid">Guardar</button>
          </footer>
        </form>
      </div>
    }
  `,
  styleUrl: './dialog-form.css',
})
export class SessionDialogComponent {
  private readonly fb = new FormBuilder().nonNullable;

  readonly open = input(false);
  readonly title = input('Abrir sesión');
  readonly save = output<{ guestCount: number; observations?: string }>();
  readonly cancel = output<void>();

  readonly form = this.fb.group({
    guestCount: [2, [Validators.required, Validators.min(1)]],
    observations: ['', [Validators.maxLength(500)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.getRawValue());
  }
}