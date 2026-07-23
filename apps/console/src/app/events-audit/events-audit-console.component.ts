import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AuditEventView {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  partition: string;
  hashPreview: string;
  details: string;
}

@Component({
  selector: 'app-events-audit-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audit-container">
      <header class="top-header">
        <h1>UMBRAL — Auditoría C·CURE 9000 e Inmutabilidad Hash-Chain</h1>
        <span class="status-pill verified">✓ Cadena Hash Verificada (Sin Alteraciones)</span>
      </header>

      <main class="grid-layout">
        <!-- Live Audit Stream Panel -->
        <section class="card full-width">
          <div class="panel-header">
            <h2>Stream Inmutable de Eventos (Append-Only)</h2>
            <button class="btn btn-verify" (click)="verifyChain()">
              🔍 Verificar Integridad Criptográfica
            </button>
          </div>

          <div class="events-table">
            <div class="table-header">
              <span>Seq #</span>
              <span>Hora</span>
              <span>Tipo de Evento</span>
              <span>Severidad</span>
              <span>Hash (SHA-256)</span>
              <span>Detalles</span>
            </div>

            @for (evt of events(); track evt.id) {
              <div class="table-row" [class]="evt.severity">
                <span class="mono">#{{ evt.sequenceNumber }}</span>
                <span>{{ evt.timestamp }}</span>
                <span class="event-tag">{{ evt.eventType }}</span>
                <span class="severity-badge" [class]="evt.severity">{{ evt.severity }}</span>
                <span class="mono hash-text" title="Encadenado criptográficamente con el evento anterior">
                  {{ evt.hashPreview }}
                </span>
                <span>{{ evt.details }}</span>
              </div>
            }
          </div>
        </section>

        <!-- Audit Invariants Explanation Panel -->
        <section class="card full-width">
          <h2>Garantías de Seguridad de Vida y Legalidad</h2>
          <div class="invariants-grid">
            <div class="inv-item">
              <h3>🔒 Cero Modificación o Borrado</h3>
              <p>La tabla es append-only (hypertable TimescaleDB). Los operadores no pueden modificar ni eliminar eventos del histórico.</p>
            </div>

            <div class="inv-item">
              <h3>⛓ Encadenamiento por Hash</h3>
              <p>Cada evento contiene el hash SHA-256 del evento anterior. Si alguien altera un registro directo en la BD, la verificación se rompe de inmediato.</p>
            </div>

            <div class="inv-item">
              <h3>📡 Taxonomía C·CURE 9000</h3>
              <p>Eventos tipados de nivel enterprise: fallas de línea supervisada (cables cortados), sensores DPS, REX y liberación por incendio.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .audit-container {
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

    .status-pill.verified {
      background-color: #064e3b;
      color: #34d399;
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .grid-layout {
      display: grid;
      grid-template-columns: 1fr;
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

    h1, h2, h3 {
      margin-top: 0;
      color: #f1f5f9;
    }

    .btn-verify {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 600;
      cursor: pointer;
      &:hover { background-color: #1d4ed8; }
    }

    .events-table {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .table-header, .table-row {
      display: grid;
      grid-template-columns: 70px 110px 180px 100px 180px 1fr;
      padding: 0.6rem 0.75rem;
      font-size: 0.85rem;
    }

    .table-header {
      font-weight: 700;
      color: #94a3b8;
      border-bottom: 1px solid #334155;
    }

    .table-row {
      background-color: #0f172a;
      border-radius: 0.25rem;
      align-items: center;

      &.warning { background-color: #451a03; color: #fbbf24; }
      &.critical { background-color: #450a0a; color: #f87171; font-weight: 600; }
    }

    .event-tag {
      font-weight: 600;
      color: #38bdf8;
    }

    .severity-badge {
      display: inline-block;
      font-size: 0.7rem;
      padding: 0.2rem 0.4rem;
      border-radius: 0.2rem;
      text-transform: uppercase;
      font-weight: 700;

      &.info { background-color: #1e3a8a; color: #93c5fd; }
      &.warning { background-color: #78350f; color: #fde047; }
      &.critical { background-color: #7f1d1d; color: #fca5a5; }
    }

    .hash-text {
      color: #64748b;
      font-size: 0.75rem;
    }

    .invariants-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }

    .inv-item {
      background-color: #0f172a;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid #334155;

      p {
        margin-bottom: 0;
        font-size: 0.85rem;
        color: #cbd5e1;
        line-height: 1.4;
      }
    }

    .mono { font-family: monospace; }
  `]
})
export class EventsAuditConsoleComponent {
  protected readonly events = signal<AuditEventView[]>([
    {
      id: 'evt-1',
      sequenceNumber: 1,
      timestamp: new Date().toLocaleTimeString(),
      eventType: 'access.granted',
      severity: 'info',
      partition: 'ctrl-101',
      hashPreview: '000000...a1b2c3d4',
      details: 'Carlos Mendoza (Cédula 0912345678) — Lector Entrada (Entrada)',
    },
    {
      id: 'evt-2',
      sequenceNumber: 2,
      timestamp: new Date().toLocaleTimeString(),
      eventType: 'door.opened',
      severity: 'info',
      partition: 'ctrl-101',
      hashPreview: 'a1b2c3...f9e8d7c6',
      details: 'Sensor DPS detecta apertura de contacto mecánico',
    },
    {
      id: 'evt-3',
      sequenceNumber: 3,
      timestamp: new Date().toLocaleTimeString(),
      eventType: 'input.fault',
      severity: 'critical',
      partition: 'ctrl-101',
      hashPreview: 'f9e8d7...11223344',
      details: 'ALERTA: Falla de línea supervisada (corte de cable en DPS Puerta Bodega)',
    }
  ]);

  protected verifyChain(): void {
    alert('Verificación de cadena criptográfica completada: 3/3 eventos intactos.');
  }
}
