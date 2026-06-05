import { Component, input, output } from '@angular/core';

@Component({
  selector: 'eatup-confirm-dialog',
  standalone: true,
  template: `
    @if (open()) {
      <div class="backdrop" (click)="cancel.emit()">
        <section class="dialog" (click)="$event.stopPropagation()">
          <div class="icon">{{ icon() }}</div>
          <h2>{{ title() }}</h2>
          <p>{{ message() }}</p>
          <footer>
            <button type="button" class="secondary" (click)="cancel.emit()">Cancelar</button>
            <button type="button" class="danger" (click)="confirm.emit()">{{ confirmText() }}</button>
          </footer>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        align-items: center;
        animation: fade 160ms ease;
        background: rgba(15, 23, 42, 0.42);
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 20px;
        position: fixed;
        z-index: 40;
      }

      .dialog {
        animation: lift 180ms ease;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
        max-width: 420px;
        padding: 24px;
        width: 100%;
      }

      .icon {
        align-items: center;
        background: #fee2e2;
        border-radius: 999px;
        color: #ef4444;
        display: inline-flex;
        font-size: 22px;
        height: 44px;
        justify-content: center;
        margin-bottom: 16px;
        width: 44px;
      }

      h2 {
        color: #222222;
        font-size: 20px;
        margin: 0 0 8px;
      }

      p {
        color: #1B1B1B;
        line-height: 1.6;
        margin: 0;
      }

      footer {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 24px;
      }

      button {
        border: 0;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 800;
        min-height: 40px;
        padding: 0 16px;
      }

      .secondary {
        background: #FFF8F2;
        color: #1B1B1B;
      }

      .danger {
        background: #ef4444;
        color: #fff;
      }

      @keyframes fade {
        from {
          opacity: 0;
        }
      }

      @keyframes lift {
        from {
          transform: translateY(8px);
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirmar acción');
  readonly message = input('Esta acción no se puede deshacer.');
  readonly confirmText = input('Confirmar');
  readonly icon = input('!');
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
