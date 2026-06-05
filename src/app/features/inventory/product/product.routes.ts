import { Routes } from '@angular/router';

export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/product-list-page/product-list-page.component')
        .then(m => m.ProductListPageComponent)
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/product-create-page/product-create-page.component')
        .then(m => m.ProductCreatePageComponent)
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/product-edit-page/product-edit-page.component')
        .then(m => m.ProductEditPageComponent)
  }
];