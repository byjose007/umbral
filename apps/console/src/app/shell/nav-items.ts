import { OperatorRole } from '../auth/models';

export interface NavItem {
  path: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** Omit to show to every authenticated role. */
  roles?: OperatorRole[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Acceso y Usuarios',
    items: [
      { path: 'identity', label: '👥 Usuarios y Pases Móviles' },
      { path: 'topology', label: '🚪 Sitios y Puertas' },
      { path: 'credentials', label: '💳 Credenciales Físicas' },
      { path: 'access-rights', label: '🔑 Permisos de Acceso' },
    ],
  },
  {
    label: 'Monitoreo',
    items: [
      { path: 'alerting', label: '⚠️ Alertas de Seguridad' },
      { path: 'events-audit', label: '📋 Histórico de Eventos' },
      { path: 'device-gateway', label: '📟 Lectores y Equipos' },
    ],
  },
  {
    label: 'Administración',
    items: [{ path: 'operators', label: '🛡️ Personal de Garita y Admins' }],
    roles: ['admin'],
  },
];
