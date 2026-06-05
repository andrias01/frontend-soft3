import { Pipe, PipeTransform } from '@angular/core';

import { TableStatus } from '../models/table.enums';
import { TABLE_STATUS_LABELS } from '../utils/table.constants';

@Pipe({
  name: 'tableStatusLabel',
  standalone: true,
})
export class TableStatusLabelPipe implements PipeTransform {
  transform(value?: TableStatus | null): string {
    return value ? TABLE_STATUS_LABELS[value] : 'Sin estado';
  }
}
