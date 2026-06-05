import { Routes } from '@angular/router';

import { tablesAccessGuard } from './guards/tables-access.guard';
import { TablesDashboardPage } from './pages/tables-dashboard.page';
import { TablesListPage } from './pages/tables-list.page';
import { TablesReservationsPage } from './pages/tables-reservations.page';
import { TablesSessionsPage } from './pages/tables-sessions.page';
import { TablesShellPage } from './pages/tables-shell.page';

export const TABLES_ROUTES: Routes = [
  {
    path: '',
    component: TablesShellPage,
    canMatch: [tablesAccessGuard],
    children: [
      {
        path: '',
        component: TablesDashboardPage,
        title: 'EatUp | Tables Dashboard',
      },
      {
        path: 'dashboard',
        pathMatch: 'full',
        redirectTo: '/commercial/tables',
      },
      {
        path: 'list',
        component: TablesListPage,
        title: 'EatUp | Mesas',
      },
      {
        path: 'sessions',
        component: TablesSessionsPage,
        title: 'EatUp | Sesiones',
      },
      {
        path: 'reservations',
        component: TablesReservationsPage,
        title: 'EatUp | Reservas',
      },
    ],
  },
];
