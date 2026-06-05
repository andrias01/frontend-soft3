import { Pipe, PipeTransform } from '@angular/core';
import { CustomerDiscount } from '@commercial/customer-discount/models/customer-discount.model';

@Pipe({ name: 'customerDiscountFilter', standalone: true, pure: true })
export class CustomerDiscountFilterPipe implements PipeTransform {
  transform(
    items: CustomerDiscount[],
    search: string,
    discountMap: Map<string, string>,
    clientMap: Map<string, string>
  ): CustomerDiscount[] {
    const q = (search ?? '').toLowerCase().trim();
    if (!q) return items;
    return items.filter(i =>
      (discountMap.get(i.discountId) ?? '').toLowerCase().includes(q) ||
      (clientMap.get(i.customerId) ?? '').toLowerCase().includes(q)
    );
  }
}