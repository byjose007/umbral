import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'topology',
        pathMatch: 'full',
      },
      {
        path: 'topology',
        loadComponent: () =>
          import('./topology/topology-console.component').then(
            (m) => m.TopologyConsoleComponent,
          ),
      },
      {
        path: 'identity',
        loadComponent: () =>
          import('./identity/identity-console.component').then(
            (m) => m.IdentityConsoleComponent,
          ),
      },
      {
        path: 'credentials',
        loadComponent: () =>
          import('./credentials/credentials-console.component').then(
            (m) => m.CredentialsConsoleComponent,
          ),
      },
      {
        path: 'access-rights',
        loadComponent: () =>
          import('./access-rights/access-rights-console.component').then(
            (m) => m.AccessRightsConsoleComponent,
          ),
      },
      {
        path: 'alerting',
        loadComponent: () =>
          import('./alerting/alerting-console.component').then(
            (m) => m.AlertingConsoleComponent,
          ),
      },
      {
        path: 'events-audit',
        loadComponent: () =>
          import('./events-audit/events-audit-console.component').then(
            (m) => m.EventsAuditConsoleComponent,
          ),
      },
      {
        path: 'device-gateway',
        loadComponent: () =>
          import('./device-gateway/device-gateway-console.component').then(
            (m) => m.DeviceGatewayConsoleComponent,
          ),
      },
    ],
  },
];
