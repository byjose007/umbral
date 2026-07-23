import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'pass',
    pathMatch: 'full',
  },
  {
    path: 'pass',
    loadComponent: () =>
      import('./user-pass/user-pass.page').then((m) => m.UserPassPage),
  },
];
