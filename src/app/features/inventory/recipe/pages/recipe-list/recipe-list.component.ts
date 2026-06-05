import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { RecipeResponse } from '../../models/recipe.model';
import { RecipeDeactivateModalComponent } from '../../components/recipe-deactivate-modal/recipe-deactivate-modal.component';
import { CustomSelectComponent, SelectOption } from '../../components/custom-select/custom-select.component';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RecipeDeactivateModalComponent, CustomSelectComponent],
  templateUrl: './recipe-list.component.html',
  styleUrl: './recipe-list.component.css'
})
export class RecipeListComponent implements OnInit {
  recipes = signal<RecipeResponse[]>([]);
  loading = signal(false);
  filtering = signal(false);
  errorMessage = signal('');

  searchTerm = signal('');
  statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  visibilityFilter = signal<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');

  deactivateModalOpen = signal(false);
  selectedRecipe = signal<RecipeResponse | null>(null);

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL',      label: 'Todos' },
    { value: 'ACTIVE',   label: 'Activas' },
    { value: 'INACTIVE', label: 'Inactivas' }
  ];

  readonly visibilityOptions: SelectOption[] = [
    { value: 'ALL',     label: 'Todas' },
    { value: 'VISIBLE', label: 'Visibles' },
    { value: 'HIDDEN',  label: 'Ocultas' }
  ];

  private filterTimer: any = null;

  filteredRecipes = computed(() => {
    let list = this.recipes();
    const term = this.searchTerm().toLowerCase().trim();

    if (term) {
      list = list.filter(r => r.name.toLowerCase().includes(term));
    }
    if (this.statusFilter() === 'ACTIVE') {
      list = list.filter(r => r.active);
    } else if (this.statusFilter() === 'INACTIVE') {
      list = list.filter(r => !r.active);
    }
    if (this.visibilityFilter() === 'VISIBLE') {
      list = list.filter(r => r.visibleInMenu);
    } else if (this.visibilityFilter() === 'HIDDEN') {
      list = list.filter(r => !r.visibleInMenu);
    }
    return list;
  });

  constructor(private recipeService: RecipeService, private router: Router) {}

  ngOnInit(): void {
    this.loadRecipes();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.triggerFilterAnimation();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value as 'ALL' | 'ACTIVE' | 'INACTIVE');
    this.triggerFilterAnimation();
  }

  onVisibilityChange(value: string): void {
    this.visibilityFilter.set(value as 'ALL' | 'VISIBLE' | 'HIDDEN');
    this.triggerFilterAnimation();
  }

  private triggerFilterAnimation(): void {
    this.filtering.set(true);
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => this.filtering.set(false), 350);
  }

  loadRecipes(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.recipeService.list().subscribe({
      next: data => {
        this.recipes.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.errorMessage.set(this.friendlyMessage(err, 'No se pudieron cargar las recetas. Intenta de nuevo.'));
        this.loading.set(false);
      }
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('ALL');
    this.visibilityFilter.set('ALL');
  }

  goToCreate(): void {
    this.router.navigate(['/inventory/recipes/create']);
  }

  goToEdit(recipe: RecipeResponse): void {
    this.router.navigate(['/inventory/recipes', recipe.id, 'edit']);
  }

  openDeactivate(recipe: RecipeResponse): void {
    this.selectedRecipe.set(recipe);
    this.deactivateModalOpen.set(true);
  }

  confirmDeactivate(): void {
    const recipe = this.selectedRecipe();
    if (!recipe) return;
    this.recipeService.deactivate(recipe.name).subscribe({
      next: () => {
        this.deactivateModalOpen.set(false);
        this.loadRecipes();
      },
      error: err => {
        this.errorMessage.set(this.friendlyMessage(err, 'No se pudo inactivar la receta. Intenta de nuevo.'));
        this.deactivateModalOpen.set(false);
      }
    });
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
    if (status === 400) return 'Los datos ingresados no son válidos.';
    if (status === 403) return 'No tienes permiso para realizar esta acción.';
    if (status === 0)   return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    return fallback;
  }
}
