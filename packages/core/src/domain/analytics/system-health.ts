export interface HealthMetric {
  readonly resourceType: 'controller' | 'reader' | 'door' | 'cardholder' | 'client';
  readonly onlineCount: number;
  readonly totalCount: number;
  readonly healthPercentage: number;
  readonly status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

export interface SystemHealthDashboard {
  readonly generatedAt: Date;
  readonly overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  readonly controllers: HealthMetric;
  readonly readers: HealthMetric;
  readonly doors: HealthMetric;
  readonly cardholders: { activeCount: number; totalCount: number };
  readonly connectedClients: { activeCount: number; totalCount: number };
}

export interface GrafanaDashboardConfig {
  readonly dashboardTitle: string;
  readonly embedUrl: string;
  readonly panels: Array<{ id: string; title: string; type: string }>;
  readonly refreshIntervalSeconds: number;
}

export class SystemHealthAggregator {
  public static computeDashboard(
    controllers: Array<{ id: string; isOnline: boolean }>,
    readers: Array<{ id: string; isOnline: boolean }>,
    doors: Array<{ id: string; isOnline: boolean }>,
    cardholders: { activeCount: number; totalCount: number },
    clients: { activeCount: number; totalCount: number }
  ): SystemHealthDashboard {
    const calcMetric = (
      type: 'controller' | 'reader' | 'door' | 'cardholder' | 'client',
      items: Array<{ id: string; isOnline: boolean }>
    ): HealthMetric => {
      const total = items.length;
      const online = items.filter(i => i.isOnline).length;
      const percentage = total > 0 ? (online / total) * 100 : 100;
      let status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
      if (percentage <= 50) status = 'CRITICAL';
      else if (percentage < 90) status = 'DEGRADED';

      return {
        resourceType: type,
        onlineCount: online,
        totalCount: total,
        healthPercentage: Math.round(percentage * 10) / 10,
        status,
      };
    };

    const ctrlMetric = calcMetric('controller', controllers);
    const rdrMetric = calcMetric('reader', readers);
    const doorMetric = calcMetric('door', doors);

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (ctrlMetric.status === 'CRITICAL' || rdrMetric.status === 'CRITICAL' || doorMetric.status === 'CRITICAL') {
      overallStatus = 'CRITICAL';
    } else if (ctrlMetric.status === 'DEGRADED' || rdrMetric.status === 'DEGRADED' || doorMetric.status === 'DEGRADED') {
      overallStatus = 'DEGRADED';
    }

    return {
      generatedAt: new Date(),
      overallStatus,
      controllers: ctrlMetric,
      readers: rdrMetric,
      doors: doorMetric,
      cardholders,
      connectedClients: clients,
    };
  }

  public static getGrafanaDashboardConfig(): GrafanaDashboardConfig {
    return {
      dashboardTitle: 'UMBRAL Physical Access Control Operational Health',
      embedUrl: '/grafana/d/umbral-pacs-health/operational-health?orgId=1&kiosk',
      panels: [
        { id: 'p1', title: 'Flow Throughput (Events/min)', type: 'graph' },
        { id: 'p2', title: 'Controllers Online vs Offline', type: 'stat' },
        { id: 'p3', title: 'Zone Occupancy Heatmap', type: 'heatmap' },
        { id: 'p4', title: 'Access Denials & Security Anomalies', type: 'logs' },
      ],
      refreshIntervalSeconds: 10,
    };
  }
}
