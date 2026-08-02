import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../shared/ui/toast.service';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusBadgeComponent, BadgeTone } from '../shared/ui/status-badge.component';

interface FeedEventDto {
  id: string;
  timestamp: string;
  doorId?: string | null;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  pseudonymizedPersonId: string | null;
  hasPii: boolean;
}

interface DoorDto {
  hierarchicalName: string;
  door: { props: { id: string } };
}

interface RevealPiiResponseDto {
  eventId: string;
  rawPersonId: string;
}

interface PersonDto {
  id: string;
  firstName: string;
  lastName: string;
}

interface AlertDto {
  id: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'escalated' | 'cleared';
  acknowledgedBy: string | null;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface FeedItemView {
  id: string;
  time: string;
  doorName: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  pseudonym: string | null;
  hasPii: boolean;
  revealedName: string | null;
}

export interface AlertView {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  timeAgo: string;
  status: AlertDto['status'];
  acknowledgedBy: string | null;
}

const EVENT_LABELS: Record<string, { title: string; description: string }> = {
  'input.fault': {
    title: 'Falla de línea supervisada',
    description: 'El sensor DPS reporta resistencia fuera de rango (posible corte o puenteo de cable).',
  },
  'rex.activated': {
    title: 'Solicitud de salida (REX) activada',
    description: 'Se activó el sensor de solicitud de salida en la puerta.',
  },
  'fire.release_detected': {
    title: 'Liberación por incendio detectada',
    description: 'El sistema contraincendios liberó las cerraduras de la zona.',
  },
  'door.forced_open': {
    title: 'Apertura forzada de puerta',
    description: 'Se detectó una apertura sin autorización previa (DPS violado).',
  },
};

function describeEventType(eventType: string): { title: string; description: string } {
  return (
    EVENT_LABELS[eventType] ?? {
      title: eventType,
      description: 'Evento generado automáticamente por una regla de alertamiento.',
    }
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

function severityTone(severity: 'info' | 'warning' | 'critical'): BadgeTone {
  return severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'info';
}

const FEED_POLL_MS = 4000;

@Component({
  selector: 'app-alerting-console',
  standalone: true,
  imports: [PageHeaderComponent, StatusBadgeComponent],
  template: `
    <div class="p-6">
      <app-page-header
        title="Feed de Actividad en Vivo y Motor de Alertas"
        subtitle="Feed seudonimizado (cumplimiento LOPDP DP-06): la identidad solo se revela bajo auditoría explícita."
      >
        <app-status-badge status tone="info">● Feed seudonimizado activo</app-status-badge>
      </app-page-header>

      <main class="grid grid-cols-1 gap-6">
        <section class="min-w-0 rounded-lg border border-border bg-surface p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-base font-semibold text-text">Feed de Actividad en Tiempo Real</h2>
            <app-status-badge tone="danger">● EN VIVO</app-status-badge>
          </div>

          @if (feedError()) {
            <p class="text-sm text-danger">{{ feedError() }}</p>
          } @else if (feedItems().length === 0) {
            <p class="text-sm text-text-muted">Sin actividad reciente.</p>
          } @else {
            <div class="u-table-wrap">
              <table class="u-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Puerta</th>
                    <th>Evento</th>
                    <th>Severidad</th>
                    <th>Persona</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of feedItems(); track item.id) {
                    <tr>
                      <td class="font-mono text-xs text-text-faint">{{ item.time }}</td>
                      <td>{{ item.doorName }}</td>
                      <td class="text-teal">{{ item.eventType }}</td>
                      <td><app-status-badge [tone]="severityTone(item.severity)">{{ item.severity }}</app-status-badge></td>
                      <td>
                        @if (item.revealedName) {
                          <span class="font-medium text-success">{{ item.revealedName }} (auditado)</span>
                        } @else if (item.hasPii) {
                          <code class="font-mono text-xs text-text-muted">{{ item.pseudonym }}</code>
                        } @else {
                          <span class="text-xs text-text-faint">N/D</span>
                        }
                      </td>
                      <td>
                        @if (item.hasPii && !item.revealedName) {
                          <button
                            type="button"
                            class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
                            (click)="revealIdentity(item)"
                          >
                            Revelar
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="rounded-lg border border-border bg-surface p-5">
          <h2 class="mb-3 text-base font-semibold text-text">Alertas Activas que Requieren Acción</h2>

          @if (alertsError()) {
            <p class="text-sm text-danger">{{ alertsError() }}</p>
          } @else if (alerts().length === 0) {
            <p class="text-sm text-text-muted">No hay alertas activas.</p>
          } @else {
            <div class="flex flex-col gap-3">
              @for (alert of alerts(); track alert.id) {
                <div class="rounded-md border border-danger-bg bg-bg p-4">
                  <div class="mb-1 flex items-center justify-between gap-3">
                    <span class="font-semibold text-danger">{{ alert.title }}</span>
                    <app-status-badge [tone]="severityTone(alert.severity)">{{ alert.severity }}</app-status-badge>
                  </div>
                  <p class="mb-3 text-sm text-text-muted">{{ alert.description }}</p>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-text-faint">{{ alert.timeAgo }}</span>
                    @if (alert.status === 'active') {
                      <button
                        type="button"
                        class="rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        (click)="acknowledgeAlert(alert)"
                      >
                        Reconocer alerta (ACK)
                      </button>
                    } @else {
                      <span class="text-xs font-semibold text-success">✓ Reconocida por {{ alert.acknowledgedBy }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>
      </main>
    </div>
  `,
})
export class AlertingConsoleComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly severityTone = severityTone;

  protected readonly feedItems = signal<FeedItemView[]>([]);
  protected readonly feedError = signal<string | null>(null);
  protected readonly alerts = signal<AlertView[]>([]);
  protected readonly alertsError = signal<string | null>(null);

  private doorNameById = new Map<string, string>();
  private pollHandle?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.http.get<DoorDto[]>(`${API_BASE_URL}/topology/doors`).subscribe({
      next: (doors) => {
        this.doorNameById = new Map(doors.map((d) => [d.door.props.id, d.hierarchicalName]));
      },
    });

    this.loadFeed();
    this.loadAlerts();
    this.pollHandle = setInterval(() => this.loadFeed(), FEED_POLL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
  }

  private loadFeed(): void {
    this.http.get<FeedEventDto[]>(`${API_BASE_URL}/events-audit/feed`, { params: { limit: '25' } }).subscribe({
      next: (events) => {
        const previouslyRevealed = new Map(this.feedItems().map((i) => [i.id, i.revealedName]));
        this.feedItems.set(
          events.map((e) => ({
            id: e.id,
            time: new Date(e.timestamp).toLocaleTimeString(),
            doorName: e.doorId ? this.doorNameById.get(e.doorId) ?? e.doorId : 'N/D',
            eventType: e.eventType,
            severity: e.severity,
            pseudonym: e.pseudonymizedPersonId,
            hasPii: e.hasPii,
            revealedName: previouslyRevealed.get(e.id) ?? null,
          })),
        );
        this.feedError.set(null);
      },
      error: () => {
        this.feedError.set('No se pudo cargar el feed de actividad desde el backend.');
      },
    });
  }

  private loadAlerts(): void {
    this.http
      .get<AlertDto[]>(`${API_BASE_URL}/alerting/alerts`, { params: { status: 'active' } })
      .subscribe({
        next: (alerts) => {
          this.alerts.set(
            alerts.map((a) => {
              const { title, description } = describeEventType(a.eventType);
              return {
                id: a.id,
                title,
                description,
                severity: a.severity,
                timeAgo: timeAgo(a.timestamp),
                status: a.status,
                acknowledgedBy: a.acknowledgedBy,
              };
            }),
          );
          this.alertsError.set(null);
        },
        error: () => {
          this.alertsError.set('No se pudo cargar las alertas activas desde el backend.');
        },
      });
  }

  protected revealIdentity(item: FeedItemView): void {
    const operatorUser = this.authService.operator()?.email ?? 'operador.desconocido';
    this.http
      .post<RevealPiiResponseDto>(`${API_BASE_URL}/events-audit/events/${item.id}/reveal-pii`, { operatorUser })
      .subscribe({
        next: (res) => {
          this.http.get<PersonDto>(`${API_BASE_URL}/identity/persons/${res.rawPersonId}`).subscribe({
            next: (person) => {
              this.applyRevealedName(item.id, `${person.firstName} ${person.lastName}`);
              this.toastService.success(`Identidad revelada y registrada en auditoría (DP-06).`);
            },
            error: () => {
              this.applyRevealedName(item.id, res.rawPersonId);
              this.toastService.success(`Identidad revelada y registrada en auditoría (DP-06).`);
            },
          });
        },
        error: () => {
          this.toastService.error('No se pudo revelar la identidad para este evento.');
        },
      });
  }

  private applyRevealedName(eventId: string, name: string): void {
    this.feedItems.update((items) =>
      items.map((i) => (i.id === eventId ? { ...i, revealedName: name } : i)),
    );
  }

  protected acknowledgeAlert(alert: AlertView): void {
    const operatorUser = this.authService.operator()?.email ?? 'operador.desconocido';
    this.http
      .post(`${API_BASE_URL}/alerting/alerts/${alert.id}/ack`, { operatorUser })
      .subscribe({
        next: () => {
          this.toastService.success(`Alerta "${alert.title}" reconocida.`);
          this.loadAlerts();
        },
        error: () => {
          this.toastService.error('No se pudo reconocer la alerta.');
        },
      });
  }
}
