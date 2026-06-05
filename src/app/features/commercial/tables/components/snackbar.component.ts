import { Component, inject } from '@angular/core';

import { TableNotificationService } from '../services/table-notification.service';

@Component({
  selector: 'eatup-snackbar',
  standalone: true,
  template: `
    @if (notifications.message(); as snack) {
      <aside class="snackbar" [class]="snack.type">
        <span>{{ snack.message }}</span>
        <button type="button" (click)="notifications.clear()" aria-label="Cerrar notificación">×</button>
      </aside>
    }
  `,
  styles: [
    `
      .snackbar {
        align-items: center;
        animation: enter 180ms ease;
        background: #1B1B1B;
        border-radius: 8px;
        bottom: 24px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
        color: #fff;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        max-width: min(420px, calc(100vw - 32px));
        padding: 14px 16px;
        position: fixed;
        right: 24px;
        z-index: 50;
      }

      .success {
        background: #16a34a;
      }

      .error {
        background: #dc2626;
      }

      .warning {
        background: #b45309;
      }

      button {
        background: rgba(255, 255, 255, 0.18);
        border: 0;
        border-radius: 999px;
        color: #fff;
        cursor: pointer;
        font-size: 18px;
        height: 26px;
        line-height: 1;
        width: 26px;
      }

      @keyframes enter {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
      }
    `,
  ],
})
export class SnackbarComponent {
  readonly notifications = inject(TableNotificationService);
}
