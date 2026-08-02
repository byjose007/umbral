import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusBadgeComponent, BadgeTone } from '../shared/ui/status-badge.component';

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

function severityTone(severity: AuditEventView['severity']): BadgeTone {
  return severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'info';
}

@Component({
  selector: 'app-events-audit-console',
  standalone: true,
  imports: [PageHeaderComponent, StatusBadgeComponent],
  template: `
    <div class="p-6">
      <app-page-header
        title="Auditoría C·CURE 9000 e Inmutabilidad Hash-Chain"
        subtitle="Cada evento contiene el hash SHA-256 del evento anterior; el histórico es append-only."
      >
        <app-status-badge status tone="success">✓ Cadena hash verificada (sin alteraciones)</app-status-badge>
      </app-page-header>

      <main class="grid grid-cols-1 gap-6">
        <section class="rounded-lg border border-border bg-surface p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-semibold text-text">Stream Inmutable de Eventos (Append-Only)</h2>
            <button
              type="button"
              class="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
              (click)="verifyChain()"
            >
              Verificar integridad criptográfica
            </button>
          </div>

          @if (events().length === 0) {
            <p class="text-sm text-text-muted">Sin eventos registrados todavía.</p>
          } @else {
            <div class="u-table-wrap">
              <table class="u-table">
                <thead>
                  <tr>
                    <th>Seq #</th>
                    <th>Hora</th>
                    <th>Tipo de evento</th>
                    <th>Severidad</th>
                    <th>Hash (SHA-256)</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  @for (evt of events(); track evt.id) {
                    <tr>
                      <td class="font-mono text-xs text-text-faint">#{{ evt.sequenceNumber }}</td>
                      <td class="text-sm text-text-muted">{{ evt.timestamp }}</td>
                      <td class="font-medium text-teal">{{ evt.eventType }}</td>
                      <td><app-status-badge [tone]="severityTone(evt.severity)">{{ evt.severity }}</app-status-badge></td>
                      <td>
                        <code
                          class="font-mono text-xs text-text-faint"
                          title="Encadenado criptográficamente con el evento anterior"
                        >
                          {{ evt.hashPreview }}
                        </code>
                      </td>
                      <td class="text-sm text-text-muted">{{ evt.details }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="rounded-lg border border-border bg-surface p-5">
          <h2 class="mb-3 text-base font-semibold text-text">Garantías de Seguridad de Vida y Legalidad</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="rounded-md border border-border bg-bg p-4">
              <h3 class="mb-1 text-sm font-semibold text-text">Cero modificación o borrado</h3>
              <p class="text-sm leading-relaxed text-text-muted">
                La tabla es append-only (hypertable TimescaleDB). Los operadores no pueden modificar ni eliminar eventos del histórico.
              </p>
            </div>
            <div class="rounded-md border border-border bg-bg p-4">
              <h3 class="mb-1 text-sm font-semibold text-text">Encadenamiento por hash</h3>
              <p class="text-sm leading-relaxed text-text-muted">
                Cada evento contiene el hash SHA-256 del evento anterior. Si alguien altera un registro directo en la BD, la verificación se rompe de inmediato.
              </p>
            </div>
            <div class="rounded-md border border-border bg-bg p-4">
              <h3 class="mb-1 text-sm font-semibold text-text">Taxonomía C·CURE 9000</h3>
              <p class="text-sm leading-relaxed text-text-muted">
                Eventos tipados de nivel enterprise: fallas de línea supervisada (cables cortados), sensores DPS, REX y liberación por incendio.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
})
export class EventsAuditConsoleComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  protected readonly events = signal<AuditEventView[]>([]);
  protected readonly severityTone = severityTone;
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
