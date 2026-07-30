export interface NavItem {
  path: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { path: 'topology', label: 'Topología' },
      { path: 'identity', label: 'Identidades' },
      { path: 'credentials', label: 'Credenciales' },
      { path: 'access-rights', label: 'Niveles de Acceso' },
    ],
  },
  {
    label: 'Seguridad',
    items: [
      { path: 'alerting', label: 'Alertas' },
      { path: 'events-audit', label: 'Eventos y Auditoría' },
      { path: 'device-gateway', label: 'Dispositivos' },
    ],
  },
];
