import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, EMPTY, interval } from 'rxjs';
import { retry, finalize, takeUntil, switchMap, catchError } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '@commercial/discount/services/category';
import { DiscountService } from '@commercial/discount/services/discount';
import { Discount } from '@commercial/discount/models/discount.model';
import { DiscountFilterPipe } from '@commercial/discount/pipes/discount-filter.pipe';
import { DiscountStatusBadgeComponent } from '@commercial/discount/components/discount-status-badge/discount-status-badge';
import { DiscountRefreshService } from '@commercial/discount/services/discount-refresh.service';
interface Toast { id: string; type: 'success' | 'error'; message: string; }

@Component({
  selector: 'app-discount-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DiscountStatusBadgeComponent],
  templateUrl: './discount-list-page.html',
  styleUrl: './discount-list-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscountListPage implements OnInit, OnDestroy {
  private readonly discountService = inject(DiscountService);
  private readonly categoryService = inject(CategoryService);
  private readonly refreshService = inject(DiscountRefreshService);

  protected readonly discounts   = signal<Discount[]>([]);
  protected readonly categoryMap = signal<Map<string, string>>(new Map());
  protected readonly loading     = signal(false);
  protected readonly error       = signal('');
  protected readonly currentPage = signal(1);
  protected readonly search      = signal('');
  protected readonly sortBy = signal<'createdAt' | 'modifiedAt' | ''>('');
  protected readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  protected readonly confirmToggleId      = signal<string | null>(null);
  protected readonly confirmToggleCurrent = signal(false);
  protected readonly toasts = signal<Toast[]>([]);
  protected readonly pageSize        = signal(5);
  protected readonly pageSizeOptions = [5, 10, 20];

  private readonly filterPipe = new DiscountFilterPipe();
  private readonly destroy$ = new Subject<void>();
  private readonly loadTrigger$ = new Subject<void>();

   ngOnInit(): void {
      this.categoryService.getAll().subscribe({
        next: (data) => this.categoryMap.set(new Map(data.map(c => [c.id, c.name])))
      });

      this.loadTrigger$.pipe(
        switchMap(() => {
          this.loading.set(true);
          this.error.set('');
          return this.discountService.getAll().pipe(
            retry({ count: 2, delay: 800 }),
            finalize(() => this.loading.set(false)),
            catchError(err => {
              this.error.set(err.error?.message ?? 'Error al cargar.');
              return EMPTY;
            })
          );
        }),
        takeUntil(this.destroy$)
      ).subscribe(data => this.discounts.set(data));

      this.loadDiscounts();

      this.refreshService.onRefresh$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => this.loadDiscounts());

      interval(30_000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (document.visibilityState === 'visible' && !this.loading()) {
        this.silentRefresh();
      }
    });
    }

  categoryName(id: string): string {
    return this.categoryMap().get(id) ?? 'Sin categoría';
  }

  loadDiscounts(): void {
    this.loadTrigger$.next();
  }

  toggleStatus(id: string, current: boolean): void {
    this.confirmToggleId.set(id);
    this.confirmToggleCurrent.set(current);
  }

  protected confirmToggle(): void {
    const id      = this.confirmToggleId();
    const current = this.confirmToggleCurrent();
    if (!id) return;
    this.confirmToggleId.set(null);
    this.discounts.update(list => list.map(d => d.id === id ? { ...d, status: !current } : d));
    this.discountService.updateStatus(id, { status: !current }).subscribe({
      next: () => this.showToast('success', current ? 'Descuento desactivado correctamente.' : 'Descuento activado correctamente.'),
      error: () => {
        this.discounts.update(list => list.map(d => d.id === id ? { ...d, status: current } : d));
        this.showToast('error', 'No se pudo cambiar el estado. Intenta de nuevo.');
      }
    });
  }

  protected cancelToggle(): void {
    this.confirmToggleId.set(null);
  }

protected readonly filteredDiscounts = computed(() => {
  let list = this.filterPipe.transform(this.discounts(), this.search(), this.categoryMap());
  switch (this.statusFilter()) {
    case 'active':   list = list.filter(d =>  d.status); break;
    case 'inactive': list = list.filter(d => !d.status); break;
  }
  switch (this.sortBy()) {
    case 'createdAt':  list = [...list].sort((a, b) => new Date(b.createdAt).getTime()  - new Date(a.createdAt).getTime()); break;
    case 'modifiedAt': list = [...list].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()); break;
  }
  return list;
});

protected readonly totalPages = computed(() =>
  Math.ceil(this.filteredDiscounts().length / this.pageSize())
);

protected readonly paginatedDiscounts = computed(() => {
  const s = (this.currentPage() - 1) * this.pageSize();
  return this.filteredDiscounts().slice(s, s + this.pageSize());
});

protected readonly totalActive   = computed(() => this.discounts().filter(d => d.status).length);
protected readonly totalInactive = computed(() => this.discounts().filter(d => !d.status).length);

protected readonly rangeStart = computed(() =>
  this.filteredDiscounts().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
);
protected readonly rangeEnd = computed(() =>
  Math.min(this.currentPage() * this.pageSize(), this.filteredDiscounts().length)
);

goToPage(page: number): void  { if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page); }
onSearch(value: string): void { this.search.set(value); this.currentPage.set(1); }
onSort(value: string): void   { this.sortBy.set(value as any); this.currentPage.set(1); }

onStatusFilter(v: string): void { this.statusFilter.set(v as any); this.currentPage.set(1); }
clearFilters(): void { this.search.set(''); this.sortBy.set(''); this.statusFilter.set('all'); this.currentPage.set(1); }
onPageSize(value: string): void { this.pageSize.set(Number(value)); this.currentPage.set(1); }

protected truncate(text: string, max = 50): string {
  return text && text.length > max ? text.slice(0, max) + '...' : (text ?? '');
}

protected showToast(type: 'success' | 'error', message: string): void {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}`;
  this.toasts.update(t => [...t, { id, type, message }]);
  setTimeout(() => this.removeToast(id), 4000);
}

protected removeToast(id: string): void {
  this.toasts.update(t => t.filter(x => x.id !== id));
}

private silentRefresh(): void {
  this.discountService.getAll().pipe(
    catchError(() => EMPTY)
  ).subscribe(data => this.discounts.set(data));
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
}