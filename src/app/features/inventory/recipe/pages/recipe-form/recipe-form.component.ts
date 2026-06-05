import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomSelectComponent, SelectOption } from '../../components/custom-select/custom-select.component';
import { ActivatedRoute, Router } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { RecipeProductItem, RecipeRequest, RecipeResponse, RecipeSubRecipeItem } from '../../models/recipe.model';
import { RecipeProductService } from '../../services/product.service';
import { CategoryService, CategoryDTO } from '../../services/category.service';
import { ENV } from '@config/env.config';
import { AuthService } from '@features/user/services/auth.service';

interface ProductOption {
  id: string;
  name: string;
  salePrice: number;
}

interface SubRecipeOption {
  id: string;
  name: string;
  baseCost: number;
}

interface ProductRow {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface SubRecipeRow {
  subRecipeId: string;
  name: string;
  quantity: number;
  baseCost: number;
}

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.css'
})
export class RecipeFormComponent implements OnInit {
  isEdit = false;
  recipeId = '';
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  productsLoadError = signal(false);
  productsLoading = signal(true);
  categoriesLoading = signal(true);

  name = '';
  categoryId = '';
  profitMargin: number | null = null;
  visibleInMenu = true;
  active = true;

  productRows = signal<ProductRow[]>([]);
  subRecipeRows = signal<SubRecipeRow[]>([]);

  availableProducts: ProductOption[] = [];
  availableSubRecipes: SubRecipeOption[] = [];
  availableCategories: CategoryDTO[] = [];
  categoriesLoadError = signal(false);

  selectedProductId = '';
  selectedSubRecipeId = '';

  get categoryOptions(): SelectOption[] {
    return this.availableCategories.map(c => ({ value: c.id, label: c.name }));
  }

  get productOptions(): SelectOption[] {
    return this.availableProducts.map(p => ({
      value: p.id,
      label: p.name,
      disabled: this.productRows().some(r => r.productId === p.id)
    }));
  }

  get subRecipeOptions(): SelectOption[] {
    return this.availableSubRecipes.map(s => ({
      value: s.id,
      label: s.name,
      disabled: this.subRecipeRows().some(r => r.subRecipeId === s.id)
    }));
  }

  baseCost = signal(0);
  sellingPrice = signal(0);

  nameError = '';
  categoryError = '';
  profitMarginError = '';
  productListError = '';

  private readonly NAME_REGEX = /^[a-zA-Z0-9ÁÉÍÓÚáéíóúñÑ ]+$/;
  private readonly authService = inject(AuthService);

  constructor(
    private recipeService: RecipeService,
    private productService: RecipeProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.recipeId = this.route.snapshot.paramMap.get('id') ?? '';
    this.isEdit = !!this.recipeId;

    this.loadProducts();
    this.loadCategories();
    this.loadSubRecipes();

    if (this.isEdit) {
      this.loadRecipe();
    }
  }

  private loadProducts(): void {
    this.productsLoading.set(true);
    this.productService.getByLocation(this.authService.getLocationId() || ENV.locationId).subscribe({
      next: page => {
        this.availableProducts = page.content.map(p => ({
          id: p.id,
          name: p.name,
          salePrice: p.salePrice
        }));
        this.productsLoadError.set(false);
        this.productsLoading.set(false);
      },
      error: () => {
        this.productsLoadError.set(true);
        this.productsLoading.set(false);
      }
    });
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoryService.getActive().subscribe({
      next: cats => {
        this.availableCategories = cats;
        this.categoriesLoadError.set(false);
        this.categoriesLoading.set(false);
      },
      error: () => {
        this.categoriesLoadError.set(true);
        this.categoriesLoading.set(false);
      }
    });
  }

  private loadSubRecipes(): void {
    this.recipeService.list().subscribe({
      next: recipes => {
        this.availableSubRecipes = recipes
          .filter(r => r.active && r.id !== this.recipeId)
          .map(r => ({ id: r.id, name: r.name, baseCost: r.baseCost }));
      },
      error: () => {}
    });
  }

  private loadRecipe(): void {
    this.loading.set(true);
    this.recipeService.getById(this.recipeId).subscribe({
      next: recipe => {
        this.name = recipe.name;
        this.categoryId = recipe.categoryId ?? '';
        this.profitMargin = recipe.profitMargin;
        this.visibleInMenu = recipe.visibleInMenu;
        this.active = recipe.active;

        const rows: ProductRow[] = recipe.products.map(p => ({
          productId: p.productId,
          name: this.availableProducts.find(a => a.id === p.productId)?.name ?? p.productId,
          quantity: p.quantity,
          price: p.price
        }));
        this.productRows.set(rows);

        const subs: SubRecipeRow[] = (recipe.subRecipes ?? []).map(s => ({
          subRecipeId: s.subRecipeId,
          name: this.availableSubRecipes.find(a => a.id === s.subRecipeId)?.name ?? s.subRecipeId,
          quantity: s.quantity,
          baseCost: this.availableSubRecipes.find(a => a.id === s.subRecipeId)?.baseCost ?? 0
        }));
        this.subRecipeRows.set(subs);

        this.recalculate();
        this.loading.set(false);
      },
      error: err => {
        const msg = this.friendlyMessage(err, 'No se encontró la receta.');
        this.errorMessage.set(msg);
        this.loading.set(false);
      }
    });
  }

  addProduct(): void {
    if (!this.selectedProductId) return;
    const already = this.productRows().some(r => r.productId === this.selectedProductId);
    if (already) {
      this.productListError = 'Este producto ya fue agregado.';
      return;
    }
    const product = this.availableProducts.find(p => p.id === this.selectedProductId)!;
    this.productRows.update(rows => [
      ...rows,
      { productId: product.id, name: product.name, quantity: 1, price: product.salePrice }
    ]);
    this.selectedProductId = '';
    this.productListError = '';
    this.recalculate();
  }

  removeProduct(index: number): void {
    this.productRows.update(rows => rows.filter((_, i) => i !== index));
    this.recalculate();
  }

  addSubRecipe(): void {
    if (!this.selectedSubRecipeId) return;
    const already = this.subRecipeRows().some(r => r.subRecipeId === this.selectedSubRecipeId);
    if (already) return;
    const sub = this.availableSubRecipes.find(s => s.id === this.selectedSubRecipeId)!;
    this.subRecipeRows.update(rows => [
      ...rows,
      { subRecipeId: sub.id, name: sub.name, quantity: 1, baseCost: sub.baseCost }
    ]);
    this.selectedSubRecipeId = '';
    this.recalculate();
  }

  removeSubRecipe(index: number): void {
    this.subRecipeRows.update(rows => rows.filter((_, i) => i !== index));
    this.recalculate();
  }

  recalculate(): void {
    const productsCost = this.productRows().reduce((sum, r) => sum + (r.price * r.quantity), 0);
    const subRecipesCost = this.subRecipeRows().reduce((sum, r) => sum + (r.baseCost * r.quantity), 0);
    const base = productsCost + subRecipesCost;
    this.baseCost.set(base);
    const margin = this.profitMargin ?? 0;
    this.sellingPrice.set(base * (1 + margin / 100));
  }

  onProfitMarginChange(): void {
    this.recalculate();
  }

  validate(): boolean {
    let valid = true;
    this.nameError = '';
    this.categoryError = '';
    this.profitMarginError = '';
    this.productListError = '';

    const trimName = this.name.trim();
    if (!trimName) {
      this.nameError = 'El nombre es obligatorio.';
      valid = false;
    } else if (trimName.length < 3 || trimName.length > 150) {
      this.nameError = 'El nombre debe tener entre 3 y 150 caracteres.';
      valid = false;
    } else if (!this.NAME_REGEX.test(trimName)) {
      this.nameError = 'Solo se permiten letras, números, tildes y espacios.';
      valid = false;
    }

    if (!this.categoryId.trim()) {
      this.categoryError = 'La categoría es obligatoria.';
      valid = false;
    }

    if (this.profitMargin === null || this.profitMargin === undefined) {
      this.profitMarginError = 'El margen de ganancia es obligatorio.';
      valid = false;
    } else if (this.profitMargin < 0) {
      this.profitMarginError = 'El margen no puede ser negativo.';
      valid = false;
    } else if (this.profitMargin > 100) {
      this.profitMarginError = 'El margen no puede superar el 100%.';
      valid = false;
    }

    if (this.productRows().length === 0) {
      this.productListError = 'Debe agregar al menos un producto.';
      valid = false;
    }

    for (const row of this.productRows()) {
      if (!row.quantity || row.quantity < 1) {
        this.productListError = 'La cantidad de cada producto debe ser mayor a 0.';
        valid = false;
        break;
      }
      if (row.price < 0) {
        this.productListError = 'El precio de cada producto no puede ser negativo.';
        valid = false;
        break;
      }
    }

    for (const sub of this.subRecipeRows()) {
      if (!sub.quantity || sub.quantity < 1) {
        this.productListError = 'La cantidad de cada sub-receta debe ser mayor a 0.';
        valid = false;
        break;
      }
    }

    return valid;
  }

  save(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (!this.validate()) return;

    const request: RecipeRequest = {
      name: this.name.trim(),
      categoryId: this.categoryId.trim(),
      products: this.productRows().map(r => ({
        productId: r.productId,
        quantity: r.quantity,
        price: r.price
      })),
      subRecipes: this.subRecipeRows().map(r => ({
        subRecipeId: r.subRecipeId,
        quantity: r.quantity
      })),
      profitMargin: this.profitMargin!,
      visibleInMenu: this.visibleInMenu,
      active: this.active
    };

    this.saving.set(true);
    const op$ = this.isEdit
      ? this.recipeService.update(request)
      : this.recipeService.create(request);

    op$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/inventory/recipes']);
      },
      error: err => {
        const msg = this.friendlyMessage(err, 'No se pudo guardar la receta. Intenta de nuevo.');
        this.errorMessage.set(msg);
        this.saving.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/inventory/recipes']);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  }

  private friendlyMessage(err: any, fallback: string): string {
    const status = err?.status;
    const backendMsg = err?.error?.message;

    if (backendMsg && typeof backendMsg === 'string' && backendMsg.length < 200) {
      const isTechnical = /exception|stack|null pointer|sql|hibernate|http|uri|route|path/i.test(backendMsg);
      if (!isTechnical) return backendMsg;
    }

    if (status === 404) return 'El recurso solicitado no fue encontrado.';
    if (status === 409) return 'Ya existe una receta con ese nombre.';
    if (status === 400) return 'Los datos ingresados no son válidos. Revisa el formulario.';
    if (status === 403) return 'No tienes permiso para realizar esta acción.';
    if (status === 0)   return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    return fallback;
  }
}
