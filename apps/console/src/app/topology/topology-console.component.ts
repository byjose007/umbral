import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { ToastService } from '../shared/ui/toast.service';
import { ConfirmService } from '../shared/ui/confirm.service';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';

interface SiteDto {
  props: { id: string; code: string; name: string; timezone: string };
}

interface LockProfileDto {
  props: { id: string; name: string };
}

interface DoorDto {
  hierarchicalName: string;
  door: {
    props: {
      id: string;
      lockProfileId: string;
      dpsSupervised: boolean;
      rexSupervised: boolean;
    };
  };
}

interface DoorView {
  id: string;
  hierarchicalName: string;
  lockProfileName: string;
  dpsSupervised: boolean;
  rexSupervised: boolean;
}

interface ActionLogEntry {
  id: string;
  timestamp: string;
  message: string;
  severity: 'info' | 'critical';
}

@Component({
  selector: 'app-topology-console',
  standalone: true,
  imports: [PageHeaderComponent, StatusBadgeComponent],
  template: `
    <div class="p-6">
      <app-page-header title="Consola de Topología y Simulador">
        @if (isLoading()) {
          <app-status-badge status tone="neutral">Cargando…</app-status-badge>
        } @else if (loadError()) {
          <app-status-badge status tone="danger">● Sin conexión con el backend</app-status-badge>
        } @else {
          <app-status-badge status tone="success">● Simulador en línea</app-status-badge>
        }
      </app-page-header>

      @if (loadError()) {
        <p class="text-sm text-danger">{{ loadError() }}</p>
      } @else {
        <main class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
          <section class="rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Jerarquía de la Instalación</h2>
            <div class="space-y-2">
              @for (site of sites(); track site.id) {
                <div class="rounded-md border border-border bg-bg px-3 py-2">
                  <span class="mr-2 font-bold text-teal">{{ site.code }}</span>
                  <span class="text-text">{{ site.name }}</span>
                  <span class="ml-1 text-sm text-text-muted">({{ site.timezone }})</span>
                </div>
              }
              @empty {
                <p class="text-sm text-text-muted">No hay sitios registrados todavía.</p>
              }
            </div>
          </section>

          <section class="min-w-0 rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Puertas y Dispositivos</h2>
            @if (doors().length === 0) {
              <p class="text-sm text-text-muted">No hay puertas registradas todavía.</p>
            } @else {
              <div class="u-table-wrap">
                <table class="u-table">
                  <thead>
                    <tr>
                      <th>Puerta</th>
                      <th>Supervisión</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (door of doors(); track door.id) {
                      <tr>
                        <td>
                          <div class="font-medium text-text">{{ door.hierarchicalName }}</div>
                          <div class="text-xs text-text-muted">Perfil: {{ door.lockProfileName }}</div>
                        </td>
                        <td>
                          <div class="flex gap-2">
                            @if (door.dpsSupervised) {
                              <app-status-badge tone="success">DPS</app-status-badge>
                            }
                            @if (door.rexSupervised) {
                              <app-status-badge tone="success">REX</app-status-badge>
                            }
                          </div>
                        </td>
                        <td>
                          <div class="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              class="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover"
                              (click)="grantAccess(door)"
                            >
                              Abrir puerta
                            </button>
                            <button
                              type="button"
                              class="rounded-md border border-danger px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger-bg"
                              (click)="triggerForcedOpen(door)"
                            >
                              Simular forzada
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
            <h2 class="mb-3 text-base font-semibold text-text">
              Registro de Acciones del Simulador (esta sesión)
            </h2>
            <div class="space-y-1">
              @for (entry of actionLog(); track entry.id) {
                <div
                  class="rounded px-3 py-2 text-sm"
                  [class]="entry.severity === 'critical' ? 'bg-danger-bg text-danger' : 'bg-bg text-text-muted'"
                >
                  <span class="mr-2 font-mono">{{ entry.timestamp }}</span>
                  {{ entry.message }}
                </div>
              } @empty {
                <p class="text-sm text-text-muted">Sin acciones todavía en esta sesión.</p>
              }
            </div>
          </section>
        </main>
      }
    </div>
  `,
})
export class TopologyConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly sites = signal<{ id: string; code: string; name: string; timezone: string }[]>([]);
  protected readonly doors = signal<DoorView[]>([]);
  protected readonly actionLog = signal<ActionLogEntry[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      sites: this.http.get<SiteDto[]>(`${API_BASE_URL}/topology/sites`),
      lockProfiles: this.http.get<LockProfileDto[]>(`${API_BASE_URL}/topology/lock-profiles`),
      doors: this.http.get<DoorDto[]>(`${API_BASE_URL}/topology/doors`),
    }).subscribe({
      next: ({ sites, lockProfiles, doors }) => {
        const lockProfileNameById = new Map(lockProfiles.map((lp) => [lp.props.id, lp.props.name]));

        this.sites.set(sites.map((s) => s.props));
        this.doors.set(
          doors.map((d) => ({
            id: d.door.props.id,
            hierarchicalName: d.hierarchicalName,
            lockProfileName: lockProfileNameById.get(d.door.props.lockProfileId) ?? 'Desconocido',
            dpsSupervised: d.door.props.dpsSupervised,
            rexSupervised: d.door.props.rexSupervised,
          })),
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('No se pudo cargar la topología desde el backend.');
        this.isLoading.set(false);
      },
    });
  }

  protected grantAccess(door: DoorView): void {
    this.http
      .post<{ success: boolean }>(`${API_BASE_URL}/topology/simulator/grant-access`, {
        doorId: door.id,
      })
      .subscribe({
        next: () => {
          this.log(`${door.hierarchicalName}: acceso concedido por orden remota`, 'info');
          this.toastService.success(`Acceso concedido: ${door.hierarchicalName}`);
        },
        error: () => {
          this.log(`${door.hierarchicalName}: falló la orden de apertura`, 'critical');
          this.toastService.error(`Falló la orden de apertura: ${door.hierarchicalName}`);
        },
      });
  }

  protected async triggerForcedOpen(door: DoorView): Promise<void> {
    const confirmed = await this.confirmService.confirm(
      `Esto simulará una apertura forzada (DPS violado) en "${door.hierarchicalName}" y generará una alerta crítica. ¿Continuar?`,
      'Simular apertura forzada',
    );
    if (!confirmed) {
      return;
    }

    this.http
      .post<{ success: boolean }>(
        `${API_BASE_URL}/topology/simulator/forced-open/${door.id}`,
        {},
      )
      .subscribe({
        next: () => {
          this.log(`${door.hierarchicalName}: ALERTA — apertura forzada simulada (DPS violado)`, 'critical');
          this.toastService.error(`Apertura forzada simulada: ${door.hierarchicalName}`);
        },
        error: () => {
          this.log(`${door.hierarchicalName}: falló la simulación de apertura forzada`, 'critical');
          this.toastService.error(`Falló la simulación: ${door.hierarchicalName}`);
        },
      });
  }

  private log(message: string, severity: 'info' | 'critical'): void {
    this.actionLog.update((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        message,
        severity,
      },
      ...prev,
    ]);
  }
}
