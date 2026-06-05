import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CategoryService, DiscountCategory } from '@commercial/discount/services/category';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DiscountService } from '@commercial/discount/services/discount';
import { DiscountRefreshService } from '@commercial/discount/services/discount-refresh.service';
import { Discount } from '@commercial/discount/models/discount.model';



@Component({
  selector: 'app-discount-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './discount-form-page.html',
  styleUrl: './discount-form-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiscountFormPage implements OnInit {
  private readonly discountService = inject(DiscountService);
  private readonly router          = inject(Router);
  private readonly route           = inject(ActivatedRoute);
  private readonly categoryService = inject(CategoryService);
  private readonly refreshService = inject(DiscountRefreshService);


  protected readonly isEditing    = signal(false);
  protected readonly submitting   = signal(false);
  protected readonly categories   = signal<DiscountCategory[]>([]);
  protected readonly generalError = signal('');
  protected readonly formSubmitted = signal(false);

  private discountId = '';
  private currentStatus = true;

  form = new FormGroup({
    categoryId:  new FormControl('', [Validators.required]),
    percentage:  new FormControl<number | null>(null, [
      Validators.required, Validators.min(1), Validators.max(100)
    ]),
    description: new FormControl('', [
      Validators.required, Validators.minLength(5), Validators.maxLength(100)
    ])
  });

  get categoryIdCtrl()  { return this.form.get('categoryId')!; }
  get percentageCtrl()  { return this.form.get('percentage')!; }
  get descriptionCtrl() { return this.form.get('description')!; }

  ngOnInit(): void {
    this.categoryService.getAll().subscribe({
      next: (data) => this.categories.set(data.filter(c => String(c.status) === 'ACTIVE'))
    });

    this.discountId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.discountId) {
      this.isEditing.set(true);
      this.discountService.getById(this.discountId).subscribe({
        next: (data: Discount) => {
          this.currentStatus = !!data.status;
          this.form.patchValue({
            categoryId:  data.categoryId,
            percentage:  data.percentage,
            description: data.description
          })
        },
        error: () => this.generalError.set('Error al cargar el descuento.')
      });
    }
  }

  onPercentageInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = parseInt(input.value, 10);
    if (isNaN(val)) { this.percentageCtrl.setValue(null); return; }
    if (val > 100) val = 100;
    if (val < 1)   val = 1;
    this.percentageCtrl.setValue(val);
    input.value = String(val);
  }

  save(): void {
    if (this.submitting()) return;
    this.generalError.set('');
    this.formSubmitted.set(true);
    if (this.form.invalid) return;

    this.submitting.set(true);
    const { categoryId, percentage, description } = this.form.value;

    const request$ = this.isEditing()
      ? this.discountService.update(this.discountId, { categoryId: categoryId!, percentage: percentage!, description: description!.trim() })
      : this.discountService.create({ categoryId: categoryId!, percentage: percentage!, description: description!.trim() });

      
    request$.subscribe({
        next: () => {
          if (this.isEditing()) {
              this.discountService.updateStatus(this.discountId, { status: this.currentStatus }).subscribe({
              complete: () => {
                this.submitting.set(false);
                this.router.navigate(['/commercial/discount']).then(() => this.refreshService.refresh());
              },
              error: () => {
                this.submitting.set(false);
                this.router.navigate(['/commercial/discount']).then(() => this.refreshService.refresh());
              }
            });
          } else {
            this.submitting.set(false);
            this.router.navigate(['/commercial/discount']).then(() => {
              setTimeout(() => this.refreshService.refresh(), 800);
            });
          }
        },
      error: (err) => {
        this.submitting.set(false);
        const b = err.error;
        if (b?.errors?.length) {
          b.errors.forEach((e: string) => {
            if (e.includes('percentage'))  this.percentageCtrl.setErrors({ backend: 'El porcentaje debe estar entre 1 y 100.' });
            else if (e.includes('categoryId'))  this.categoryIdCtrl.setErrors({ backend: 'La categoría es obligatoria.' });
            else if (e.includes('description')) this.descriptionCtrl.setErrors({ backend: 'La descripción no es válida.' });
            else this.generalError.set(b.message ?? 'Error al guardar.');
          });
        } else {
          this.generalError.set(b?.message ?? 'Error al guardar el descuento.');
        }
      }
    });
  }

  protected showFieldError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.formSubmitted());
  }

  protected fieldError(controlName: string): string {
    const ctrl = this.form.get(controlName);
    if (!ctrl || ctrl.valid) return '';
    if (ctrl.errors?.['required'])   return 'Este campo es obligatorio.';
    if (ctrl.errors?.['minlength'])  return `Mínimo ${ctrl.errors['minlength'].requiredLength} caracteres.`;
    if (ctrl.errors?.['maxlength'])  return `Máximo ${ctrl.errors['maxlength'].requiredLength} caracteres.`;
    if (ctrl.errors?.['min'])        return `El valor mínimo es ${ctrl.errors['min'].min}.`;
    if (ctrl.errors?.['max'])        return `El valor máximo es ${ctrl.errors['max'].max}.`;
    if (ctrl.errors?.['backend'])    return ctrl.errors['backend'];
    return 'Valor no válido.';
  }
  
    onWheel(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }

  protected truncate(text: string, max = 100): string {
    return text && text.length > max ? text.slice(0, max) + '...' : (text ?? '');
  }
}