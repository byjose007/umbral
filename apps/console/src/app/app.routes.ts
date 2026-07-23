import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'topology',
    pathMatch: 'full',
  },
  {
    path: 'topology',
    loadComponent: () =>
      import('./topology/topology-console.component').then(
        (m) => m.TopologyConsoleComponent
      ),
  },
  {
    path: 'user-pass',
    loadComponent: () =>
      import('./user-pass/user-pass-pwa.component').then(
        (m) => m.UserPassPwaComponent
      ),
  },
];

