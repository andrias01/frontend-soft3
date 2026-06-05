import { Routes } from '@angular/router';
import { PurchaseListComponent } from './pages/purchase-list/purchase-list.component';
import { PurchaseFormPageComponent } from './pages/purchase-form-page/purchase-form-page.component';
import { PurchaseCancelPageComponent } from './pages/purchase-cancel-page/purchase-cancel-page.component';
import { PurchaseExportPageComponent } from './pages/purchase-export-page/purchase-export-page.component';

export const PURCHASE_ROUTES: Routes = [
  {
  path: '',
  component: PurchaseListComponent
},
{
  path: 'create',
  component: PurchaseFormPageComponent
},
{
  path: 'export/pdf',
  component: PurchaseExportPageComponent
},
{
  path: ':id/detail',
  component: PurchaseFormPageComponent
},
{
  path: ':id/edit',
  component: PurchaseFormPageComponent
},
{
  path: ':id/cancel',
  component: PurchaseCancelPageComponent
}
];