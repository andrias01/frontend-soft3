import { Pipe, PipeTransform } from '@angular/core';

import { Provider } from '@commercial/provider/models/provider.model';

@Pipe({
  name: 'providerFilter',
  standalone: true,
})
export class ProviderFilterPipe implements PipeTransform {
  transform(providers: Provider[], query: string): Provider[] {
    const normalized = (query ?? '').toLowerCase().trim();

    if (!normalized) {
      return providers;
    }

    return providers.filter((provider) =>
      [
        provider.businessName,
        provider.documentNumber,
        provider.responsibleFirstName,
        provider.responsibleLastName,
        `${provider.responsibleFirstName} ${provider.responsibleLastName}`,
        provider.phone,
        provider.email,
        provider.address,
      ].some((value) => (value ?? '').toLowerCase().includes(normalized)),
    );
  }
}
