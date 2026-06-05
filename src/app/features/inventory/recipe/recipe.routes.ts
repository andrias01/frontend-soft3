import { Routes } from '@angular/router';

export const RECIPE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/recipe-list/recipe-list.component').then(m => m.RecipeListComponent)
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/recipe-form/recipe-form.component').then(m => m.RecipeFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/recipe-form/recipe-form.component').then(m => m.RecipeFormComponent)
  }
];
