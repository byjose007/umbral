import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SiteView {
  id: string;
  code: string;
  name: string;
  timezone: string;
}

export interface DoorView {
  id: string;
  hierarchicalName: string;
  lockProfileName: string;
  status: 'locked' | 'unlocked' | 'open' | 'held_open' | 'alarm';
  hasWiegandReader: boolean;
  riskAcceptedBy?: string | null;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  doorName: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  details: string;
}

@Component({
  selector: 'app-topology-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="topology-container">
      <header class="top-header">
        <h1>UMBRAL — Consola de Topología y Simulador</h1>
        <span class="status-pill online">● Simulador en Línea</span>
      </header>

      <main class="grid-layout">
        <!-- Site & Hierarchy Panel -->
        <section class="card">
          <h2>Jerarquía de la Instalación</h2>
          <div class="site-list">
            @for (site of sites(); track site.id) {
              <div class="site-item">
                <div class="site-header">
                  <span class="site-code">{{ site.code }}</span>
                  <span class="site-name">{{ site.name }}</span>
                  <span class="tz">({{ site.timezone }})</span>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Doors & Readers Panel -->
        <section class="card">
          <h2>Puertas y Dispositivos</h2>
          <div class="door-list">
            @for (door of doors(); track door.id) {
              <div class="door-item" [class.alarm]="door.status === 'alarm' || door.status === 'held_open'">
                <div class="door-info">
                  <span class="door-name">{{ door.hierarchicalName }}</span>
                  <span class="profile-tag">Perfil: {{ door.lockProfileName }}</span>

                  @if (door.hasWiegandReader) {
                    <span class="badge wiegand" title="Aceptación firmada por {{ door.riskAcceptedBy }}">
                      ⚠️ Wiegand (Migración con Riesgo Aceptado)
                    </span>
                  } @else {
                    <span class="badge osdp">🔒 OSDP v2.2 Secure Channel</span>
                  }
                </div>

                <div class="door-actions">
                  <button class="btn btn-unlock" (click)="grantAccess(door)">
                    🔓 Abrir Puerta
                  </button>
                  <button class="btn btn-warning" (click)="triggerHeldOpen(door)">
                    ⏳ Simular Trabada
                  </button>
                  <button class="btn btn-danger" (click)="triggerForcedOpen(door)">
                    🚨 Simular Forzada
                  </button>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Live Activity & Event Feed -->
        <section class="card full-width">
          <h2>Feed de Eventos del Simulador (Append-Only)</h2>
          <div class="events-table">
            <div class="table-header">
              <span>Hora</span>
              <span>Ubicación Jerárquica</span>
              <span>Tipo de Evento</span>
              <span>Detalles</span>
            </div>
            @for (evt of events(); track evt.id) {
              <div class="table-row" [class]="evt.severity">
                <span>{{ evt.timestamp }}</span>
                <span class="mono">{{ evt.doorName }}</span>
                <span class="event-tag">{{ evt.eventType }}</span>
                <span>{{ evt.details }}</span>
              </div>
            }
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .topology-container {
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

    .status-pill.online {
      background-color: #064e3b;
      color: #34d399;
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .grid-layout {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1.5rem;
    }

    .card {
      background-color: #1e293b;
      border-radius: 0.75rem;
      padding: 1.25rem;
      border: 1px solid #334155;
    }

    .card.full-width {
      grid-column: 1 / -1;
    }

    h1, h2 {
      margin-top: 0;
      color: #f1f5f9;
    }

    .site-item {
      background-color: #0f172a;
      padding: 0.875rem;
      border-radius: 0.5rem;
      border: 1px solid #334155;

      .site-code {
        font-weight: 700;
        color: #38bdf8;
        margin-right: 0.5rem;
      }
      .tz {
        color: #94a3b8;
        font-size: 0.875rem;
      }
    }

    .door-item {
      background-color: #0f172a;
      border: 1px solid #334155;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;

      &.alarm {
        border-color: #ef4444;
        background-color: #450a0a;
      }
    }

    .door-info {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .door-name {
      font-weight: 600;
      color: #f8fafc;
    }

    .profile-tag {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .badge {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      font-weight: 600;
    }
    .badge.wiegand {
      background-color: #78350f;
      color: #fde047;
    }
    .badge.osdp {
      background-color: #064e3b;
      color: #6ee7b7;
    }

    .door-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn {
      padding: 0.5rem 0.85rem;
      border-radius: 0.375rem;
      border: none;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background-color 0.2s;
    }
    .btn-unlock {
      background-color: #2563eb;
      color: white;
      &:hover { background-color: #1d4ed8; }
    }
    .btn-warning {
      background-color: #d97706;
      color: white;
      &:hover { background-color: #b45309; }
    }
    .btn-danger {
      background-color: #dc2626;
      color: white;
      &:hover { background-color: #b91c1c; }
    }

    .events-table {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 120px 250px 180px 1fr;
      padding: 0.6rem 0.75rem;
      font-size: 0.875rem;
    }

    .table-header {
      font-weight: 700;
      color: #94a3b8;
      border-bottom: 1px solid #334155;
    }

    .table-row {
      background-color: #0f172a;
      border-radius: 0.25rem;
      &.info { color: #f8fafc; }
      &.warning { background-color: #451a03; color: #fbbf24; }
      &.critical { background-color: #450a0a; color: #f87171; font-weight: 600; }
    }

    .mono { font-family: monospace; }
  `]
})
export class TopologyConsoleComponent {
  protected readonly sites = signal<SiteView[]>([
    { id: 'site-1', code: 'TCH', name: 'Torre Central Ecuatoriana', timezone: 'America/Guayaquil' }
  ]);

  protected readonly doors = signal<DoorView[]>([
    {
      id: 'door-1',
      hierarchicalName: 'TCH · Nivel 9 · SCN Room 9153',
      lockProfileName: 'Perfil Evacuación Pulsado',
      status: 'locked',
      hasWiegandReader: false,
    },
    {
      id: 'door-2',
      hierarchicalName: 'TCH · Parqueadero Subterráneo · Barrera Vehicular',
      lockProfileName: 'Perfil Acceso Parqueadero',
      status: 'locked',
      hasWiegandReader: true,
      riskAcceptedBy: 'director.seguridad@empresa.com',
    }
  ]);

  protected readonly events = signal<ActivityEvent[]>([
    {
      id: 'evt-init',
      timestamp: new Date().toLocaleTimeString(),
      doorName: 'TCH · Nivel 9 · SCN Room 9153',
      eventType: 'system.initialized',
      severity: 'info',
      details: 'Simulador de topología iniciado correctamente'
    }
  ]);

  protected grantAccess(door: DoorView): void {
    door.status = 'unlocked';
    this.addEvent(door.hierarchicalName, 'door.opened', 'info', 'Acceso concedido mediante orden remota de operador');
    setTimeout(() => {
      door.status = 'locked';
      this.addEvent(door.hierarchicalName, 'door.closed', 'info', 'Puerta asegurada tras impulso de relé (3000 ms)');
    }, 3000);
  }

  protected triggerHeldOpen(door: DoorView): void {
    door.status = 'held_open';
    this.addEvent(door.hierarchicalName, 'door.held_open', 'warning', 'ALERTA: Sensor DPS detecta puerta abierta más allá del timeout (15 s)');
  }

  protected triggerForcedOpen(door: DoorView): void {
    door.status = 'alarm';
    this.addEvent(door.hierarchicalName, 'door.forced_open', 'critical', 'ALERTA CRÍTICA: Apertura forzada sin autorización (DPS violado)');
  }

  private addEvent(doorName: string, eventType: string, severity: 'info' | 'warning' | 'critical', details: string): void {
    this.events.update((prev) => [
      {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toLocaleTimeString(),
        doorName,
        eventType,
        severity,
        details,
      },
      ...prev
    ]);
  }
}
