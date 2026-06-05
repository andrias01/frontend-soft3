import { Pipe, PipeTransform } from '@angular/core';
import { Discount } from '@commercial/discount/models/discount.model';

@Pipe({ name: 'discountFilter', standalone: true, pure: true })
export class DiscountFilterPipe implements PipeTransform {
  transform(discounts: Discount[], search: string, categoryMap: Map<string, string>): Discount[] {
    const q = (search ?? '').toLowerCase().trim();
    if (!q) return discounts;
    return discounts.filter(d =>
      d.description.toLowerCase().includes(q) ||
      String(d.percentage).includes(q) ||
      (categoryMap.get(d.categoryId) ?? '').toLowerCase().includes(q)
    );
  }
}