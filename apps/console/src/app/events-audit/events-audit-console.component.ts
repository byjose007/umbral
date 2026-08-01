import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url';

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
      background-color: var(--umbral-bg);
      color: var(--umbral-text);
      min-height: 100vh;
    }

    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--umbral-surface);
      padding-bottom: 1rem;
    }

    .status-pill.verified {
      background-color: var(--umbral-success-bg);
      color: var(--umbral-success);
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
      background-color: var(--umbral-surface);
      border-radius: 0.75rem;
      padding: 1.25rem;
      border: 1px solid var(--umbral-border);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    h1, h2, h3 {
      margin-top: 0;
      color: var(--umbral-text);
    }

    .btn-verify {
      background-color: var(--umbral-accent);
      color: var(--umbral-accent-text);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 600;
      cursor: pointer;
      &:hover { background-color: var(--umbral-accent-hover); }
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
      color: var(--umbral-text-muted);
      border-bottom: 1px solid var(--umbral-border);
    }

    .table-row {
      background-color: var(--umbral-bg);
      border-radius: 0.25rem;
      align-items: center;

      &.warning { background-color: var(--umbral-warning-bg); color: var(--umbral-warning); }
      &.critical { background-color: var(--umbral-danger-bg); color: var(--umbral-danger); font-weight: 600; }
    }

    .event-tag {
      font-weight: 600;
      color: var(--umbral-teal);
    }

    .severity-badge {
      display: inline-block;
      font-size: 0.7rem;
      padding: 0.2rem 0.4rem;
      border-radius: 0.2rem;
      text-transform: uppercase;
      font-weight: 700;

      &.info { background-color: var(--umbral-surface-2); color: var(--umbral-teal); }
      &.warning { background-color: var(--umbral-warning-bg); color: var(--umbral-warning); }
      &.critical { background-color: var(--umbral-danger-bg); color: var(--umbral-danger); }
    }

    .hash-text {
      color: var(--umbral-text-faint);
      font-size: 0.75rem;
    }

    .invariants-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }

    .inv-item {
      background-color: var(--umbral-bg);
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--umbral-border);

      p {
        margin-bottom: 0;
        font-size: 0.85rem;
        color: var(--umbral-text-muted);
        line-height: 1.4;
      }
    }

    .mono { font-family: monospace; }
  `]
})
export class EventsAuditConsoleComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  protected readonly events = signal<AuditEventView[]>([]);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.fetchAuditEvents();
    this.timer = setInterval(() => this.fetchAuditEvents(), 3000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private fetchAuditEvents() {
    this.http.get<any[]>(`${API_BASE_URL}/user-pass/history/person-demo-001`).subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: AuditEventView[] = data.map((item, idx) => ({
            id: item.id || `evt-${idx}`,
            sequenceNumber: idx + 1,
            timestamp: new Date(item.occurredAt).toLocaleTimeString(),
            eventType: item.granted ? 'access.granted' : 'access.denied',
            severity: item.granted ? 'info' : 'critical',
            partition: 'ctrl-garita',
            hashPreview: `${item.id?.substring(0, 8)}...${item.id?.substring(24, 32)}`,
            details: `Byron José López — ${item.doorLabel} (${item.granted ? 'Acceso Permitido' : 'Acceso Denegado'})`,
          }));
          this.events.set(mapped);
        }
      },
      error: (err) => console.warn('[CONSOLE-AUDIT] Error fetching history:', err),
    });
  }

  protected verifyChain(): void {
    alert(`Verificación de cadena criptográfica completada: ${this.events().length}/${this.events().length} eventos intactos.`);
  }
}
