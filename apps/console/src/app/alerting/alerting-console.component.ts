import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface LiveFeedItemView {
  id: string;
  timestamp: string;
  doorName: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  pseudonym: string;
  piiRevealed: boolean;
  rawPersonName?: string;
}

@Component({
  selector: 'app-alerting-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerting-container">
      <header class="top-header">
        <h1>UMBRAL — Feed de Actividad en Vivo y Motor de Alertas</h1>
        <span class="status-pill lopdp">🛡️ Feed Seudonimizado LOPDP (DP-06 Active)</span>
      </header>

      <main class="grid-layout">
        <!-- Live Pseudonymous Feed Panel -->
        <section class="card">
          <div class="panel-header">
            <h2>Feed de Actividad en Tiempo Real</h2>
            <span class="pulse-indicator">● LIVE</span>
          </div>

          <div class="feed-list">
            @for (item of feedItems(); track item.id) {
              <div class="feed-item" [class]="item.severity">
                <div class="item-main">
                  <div class="item-meta">
                    <span class="time">{{ item.timestamp }}</span>
                    <span class="door-name">{{ item.doorName }}</span>
                    <span class="event-type">{{ item.eventType }}</span>
                  </div>

                  <div class="person-tag">
                    @if (item.piiRevealed) {
                      <span class="revealed-pii">👤 {{ item.rawPersonName }} (AUDITADO)</span>
                    } @else {
                      <span class="pseudo-tag">🔒 Seudónimo: <code>{{ item.pseudonym }}</code></span>
                      <button class="btn btn-reveal" (click)="revealIdentity(item)">
                        Revelar PII (Auditado)
                      </button>
                    }
                  </div>
                </div>

                <div class="item-action">
                  <span class="badge" [class]="item.severity">{{ item.severity }}</span>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Active Alerts Panel -->
        <section class="card">
          <h2>Alertas Activas que Requieren Acción</h2>
          <div class="alerts-list">
            @for (alert of activeAlerts(); track alert.id) {
              <div class="alert-box" [class]="alert.status">
                <div class="alert-header">
                  <span class="alert-title">🚨 {{ alert.title }}</span>
                  <span class="badge critical">{{ alert.severity }}</span>
                </div>
                <p class="alert-desc">{{ alert.description }}</p>
                <div class="alert-footer">
                  <span class="time-ago">{{ alert.timeAgo }}</span>
                  @if (alert.status === 'active') {
                    <button class="btn btn-ack" (click)="acknowledgeAlert(alert)">
                      Reconocer Alerta (ACK)
                    </button>
                  } @else {
                    <span class="ack-tag">✓ Reconocida por {{ alert.ackedBy }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .alerting-container {
      padding: 1.5rem;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
    }

    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1rem;
    }

    .status-pill.lopdp {
      background-color: #1e3a8a;
      color: #93c5fd;
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .grid-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .card {
      background-color: #1e293b;
      border-radius: 0.75rem;
      padding: 1.25rem;
      border: 1px solid #334155;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .pulse-indicator {
      color: #ef4444;
      font-weight: 700;
      font-size: 0.8rem;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    h1, h2, h3 { margin-top: 0; color: #f1f5f9; }

    .feed-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .feed-item {
      background-color: #0f172a;
      border: 1px solid #334155;
      padding: 0.85rem;
      border-radius: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .item-meta {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      margin-bottom: 0.3rem;
    }

    .time { font-size: 0.8rem; color: #64748b; font-family: monospace; }
    .door-name { font-weight: 600; color: #f8fafc; }
    .event-type { font-size: 0.85rem; color: #38bdf8; }

    .person-tag {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.85rem;
    }

    .pseudo-tag { color: #94a3b8; }
    .revealed-pii { color: #34d399; font-weight: 600; }

    .btn {
      border: none;
      padding: 0.3rem 0.6rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-reveal {
      background-color: #334155;
      color: #f1f5f9;
      &:hover { background-color: #475569; }
    }

    .btn-ack {
      background-color: #16a34a;
      color: white;
      &:hover { background-color: #15803d; }
    }

    .badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: 0.2rem;
      text-transform: uppercase;
      font-weight: 700;

      &.info { background-color: #1e3a8a; color: #93c5fd; }
      &.warning { background-color: #78350f; color: #fde047; }
      &.critical { background-color: #7f1d1d; color: #fca5a5; }
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .alert-box {
      background-color: #0f172a;
      border: 1px solid #7f1d1d;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .alert-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .alert-title { font-weight: 700; color: #f87171; }
    .alert-desc { font-size: 0.85rem; color: #cbd5e1; margin: 0 0 0.8rem 0; }

    .alert-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .time-ago { font-size: 0.75rem; color: #64748b; }
    .ack-tag { font-size: 0.8rem; color: #4ade80; font-weight: 600; }
  `]
})
export class AlertingConsoleComponent {
  protected readonly feedItems = signal<LiveFeedItemView[]>([
    {
      id: 'feed-1',
      timestamp: '14:22:01',
      doorName: 'Puerta Servidores (Piso 3)',
      eventType: 'access.granted',
      severity: 'info',
      pseudonym: 'USR-A9F1',
      piiRevealed: false,
      rawPersonName: 'Ing. Carlos Mendoza',
    },
    {
      id: 'feed-2',
      timestamp: '14:23:45',
      doorName: 'Puerta Bodega Principal',
      eventType: 'input.fault',
      severity: 'critical',
      pseudonym: 'N/A (Hardware)',
      piiRevealed: false,
    }
  ]);

  protected readonly activeAlerts = signal([
    {
      id: 'alt-101',
      title: 'Falla de Línea Supervisada (Corte de Cable)',
      severity: 'critical',
      description: 'El sensor DPS de la Puerta Bodega reporta resistencia fuera de rango (posible puenteo o corte de cable).',
      timeAgo: 'Hace 2 minutos',
      status: 'active',
      ackedBy: null,
    }
  ]);

  protected revealIdentity(item: LiveFeedItemView): void {
    const confirm = window.confirm(`ATENCIÓN (Cumplimiento LOPDP DP-06):\n¿Confirma revelar la identidad de ${item.pseudonym}? Esta consulta quedará registrada de forma inalterable en la bitácora de auditoría.`);
    if (confirm) {
      item.piiRevealed = true;
    }
  }

  protected acknowledgeAlert(alertItem: any): void {
    alertItem.status = 'acknowledged';
    alertItem.ackedBy = 'operador.actual';
  }
}
