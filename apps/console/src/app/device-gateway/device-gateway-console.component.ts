import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';

interface ControllerStatusDto {
  id: string;
  name: string;
  ipAddress: string;
  certificateStatus: 'active' | 'revoked' | 'unprovisioned';
  certificateThumbprint: string | null;
  isOnline: boolean;
  clockDriftMs: number;
  clockDriftExceeded: boolean;
  appliedMatrixVersion: number;
  currentServerMatrixVersion: number;
  isMatrixUpToDate: boolean;
  firmwareVersion: string | null;
}

@Component({
  selector: 'app-device-gateway-console',
  standalone: true,
  imports: [PageHeaderComponent, StatusBadgeComponent],
  template: `
    <div class="p-6">
      <app-page-header
        title="Bus de Dispositivos MQTT / mTLS Gateway"
        subtitle="Controladores conectados sobre una VLAN aislada con mTLS obligatorio (broker EMQX)."
      >
        <app-status-badge status tone="info">● mTLS obligatorio</app-status-badge>
      </app-page-header>

      <main class="grid grid-cols-1 gap-6">
        <section class="min-w-0 rounded-lg border border-border bg-surface p-5">
          <h2 class="mb-3 text-base font-semibold text-text">Estado del Bus de Dispositivos</h2>

          @if (loadError()) {
            <p class="text-sm text-danger">{{ loadError() }}</p>
          } @else if (isLoading()) {
            <p class="text-sm text-text-muted">Cargando…</p>
          } @else if (controllers().length === 0) {
            <p class="text-sm text-text-muted">No hay controladores registrados todavía.</p>
          } @else {
            <div class="u-table-wrap">
              <table class="u-table">
                <thead>
                  <tr>
                    <th>Controlador</th>
                    <th>Certificado</th>
                    <th>Estado</th>
                    <th>Matriz</th>
                    <th>Deriva de reloj</th>
                  </tr>
                </thead>
                <tbody>
                  @for (ctrl of controllers(); track ctrl.id) {
                    <tr>
                      <td>
                        <div class="font-medium text-text">{{ ctrl.name }}</div>
                        <div class="text-xs text-text-muted">{{ ctrl.ipAddress }}</div>
                      </td>
                      <td>
                        @if (ctrl.certificateStatus === 'active') {
                          <app-status-badge tone="success" [attr.title]="ctrl.certificateThumbprint">Activo</app-status-badge>
                        } @else if (ctrl.certificateStatus === 'revoked') {
                          <app-status-badge tone="danger">Revocado</app-status-badge>
                        } @else {
                          <app-status-badge tone="neutral">Sin aprovisionar</app-status-badge>
                        }
                      </td>
                      <td>
                        @if (ctrl.isOnline) {
                          <app-status-badge tone="success">En línea</app-status-badge>
                        } @else {
                          <app-status-badge tone="neutral">Desconectado</app-status-badge>
                        }
                      </td>
                      <td>
                        <div class="text-sm text-text">v{{ ctrl.appliedMatrixVersion }} / v{{ ctrl.currentServerMatrixVersion }}</div>
                        @if (!ctrl.isMatrixUpToDate) {
                          <app-status-badge tone="warning">Reconciliación pendiente</app-status-badge>
                        } @else {
                          <app-status-badge tone="success">Sincronizado</app-status-badge>
                        }
                      </td>
                      <td>
                        @if (ctrl.clockDriftExceeded) {
                          <span class="text-sm font-semibold text-danger">{{ ctrl.clockDriftMs }} ms</span>
                        } @else {
                          <span class="text-sm text-text-muted">{{ ctrl.clockDriftMs }} ms</span>
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
          <h2 class="mb-3 text-base font-semibold text-text">Principios del Gateway de Dispositivos</h2>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="rounded-md border border-border bg-bg p-4">
              <h3 class="mb-1 text-sm font-semibold text-text">Un certificado mTLS por controlador</h3>
              <p class="text-sm text-text-muted leading-relaxed">
                Cualquier intento de conexión sin certificado válido o con certificado revocado se rechaza en el broker EMQX. Si un dispositivo es robado, se revoca sin afectar a la red.
              </p>
            </div>
            <div class="rounded-md border border-border bg-bg p-4">
              <h3 class="mb-1 text-sm font-semibold text-text">
                Ingesta idempotente (<code class="font-mono">event_id</code>)
              </h3>
              <p class="text-sm text-text-muted leading-relaxed">
                Los controladores bufferizan eventos durante desconexiones. Al reconectar, el gateway filtra duplicados mediante
                <code class="font-mono">event_id</code>, garantizando store-and-forward sin pérdidas.
              </p>
            </div>
            <div class="rounded-md border border-border bg-bg p-4">
              <h3 class="mb-1 text-sm font-semibold text-text">Disciplina de reloj NTP</h3>
              <p class="text-sm text-text-muted leading-relaxed">
                El timestamp de auditoría exige precisión. Si la deriva entre el controlador y el servidor supera los 2000 ms, se emite una alerta crítica.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
})
export class DeviceGatewayConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly controllers = signal<ControllerStatusDto[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<ControllerStatusDto[]>(`${API_BASE_URL}/device-gateway/controllers`).subscribe({
      next: (controllers) => {
        this.controllers.set(controllers);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('No se pudo cargar el estado de los controladores desde el backend.');
        this.isLoading.set(false);
      },
    });
  }
}
