import { Pipe, PipeTransform } from '@angular/core';

import { formatDateTime } from '../utils/date-formatters';

@Pipe({
  name: 'eatupDateTime',
  standalone: true,
})
export class DateTimePipe implements PipeTransform {
  transform(value?: string | null): string {
    return formatDateTime(value ?? undefined);
  }
}
