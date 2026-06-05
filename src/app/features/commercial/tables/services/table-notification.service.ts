import { Injectable, signal } from '@angular/core';

import { SnackMessage } from '../models/table.models';

@Injectable({ providedIn: 'root' })
export class TableNotificationService {
  readonly message = signal<SnackMessage | null>(null);

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  clear(): void {
    this.message.set(null);
  }

  private show(message: string, type: SnackMessage['type']): void {
    this.message.set({ message, type });
    window.setTimeout(() => this.clear(), 4200);
  }
}
