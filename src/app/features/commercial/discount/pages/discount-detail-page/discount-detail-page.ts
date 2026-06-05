import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoryService } from '@commercial/discount/services/category';
import { DiscountService } from '@commercial/discount/services/discount';
import { Discount } from '@commercial/discount/models/discount.model';

@Component({
  selector: 'app-discount-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './discount-detail-page.html',
  styleUrl: './discount-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscountDetailPage implements OnInit {
  private readonly discountService  = inject(DiscountService);
  private readonly categoryService  = inject(CategoryService);
  private readonly route            = inject(ActivatedRoute);
  private readonly router           = inject(Router);

  protected readonly discount      = signal<Discount | null>(null);
  protected readonly categoryName  = signal('—');
  protected readonly loading       = signal(true);
  protected readonly error         = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.discountService.getById(id).subscribe({
      next: (data) => {
        this.discount.set(data);
        this.loading.set(false);
        this.fetchCategoryName(data.categoryId);
      },
      error: () => {
        this.error.set('Este descuento ya no existe.');
        this.loading.set(false);
        void this.router.navigate(['/commercial/discount']);
      }
    });
  }

  private fetchCategoryName(categoryId: string): void {
    this.categoryService.getAll().subscribe({
      next: (data) => {
        const cat = data.find(c => c.id === categoryId);
        this.categoryName.set(cat?.name ?? 'Sin categoría');
      },
      error: () => this.categoryName.set('Sin categoría')
    });
  }

}