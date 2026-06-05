import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ProviderStatus } from '@commercial/provider/models/provider.model';

@Component({
  selector: 'app-provider-status-badge',
  standalone: true,
  templateUrl: './provider-status-badge.component.html',
  styleUrl: './provider-status-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderStatusBadgeComponent {
  readonly status = input<ProviderStatus | undefined>('ACTIVE');

  protected label(): string {
    return this.status() === 'INACTIVE' ? 'Inactivo' : 'Activo';
  }

  protected isInactive(): boolean {
    return this.status() === 'INACTIVE';
  }
}
