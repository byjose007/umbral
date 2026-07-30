import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ControllerGatewayView {
  id: string;
  name: string;
  ipAddress: string;
  thumbprint: string;
  certificateStatus: 'active' | 'revoked';
  onlineStatus: 'online' | 'offline';
  matrixVersion: number;
  serverMatrixVersion: number;
  clockDriftMs: number;
}

@Component({
  selector: 'app-device-gateway-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gateway-container">
      <header class="top-header">
        <h1>UMBRAL — Bus de Dispositivos MQTT / mTLS Gateway</h1>
        <span class="status-pill mtls">🔒 mTLS VLAN Aislada (EMQX Broker)</span>
      </header>

      <main class="grid-layout">
        <!-- Controller Bus Status Panel -->
        <section class="card">
          <h2>Estado del Bus de Dispositivos</h2>
          <div class="controller-list">
            @for (ctrl of controllers(); track ctrl.id) {
              <div class="controller-item" [class.offline]="ctrl.onlineStatus === 'offline'">
                <div class="ctrl-info">
                  <div class="ctrl-header">
                    <span class="ctrl-name">{{ ctrl.name }}</span>
                    <span class="ctrl-ip">({{ ctrl.ipAddress }})</span>
                  </div>

                  <span class="cert-thumb">
                    Certificado mTLS: <code>{{ ctrl.thumbprint }}</code>
                  </span>

                  <div class="sync-info">
                    <span>Versión de Matriz: <strong>v{{ ctrl.matrixVersion }}</strong> / v{{ ctrl.serverMatrixVersion }}</span>
                    @if (ctrl.matrixVersion < ctrl.serverMatrixVersion) {
                      <span class="badge push-needed">⚠️ Reconciliación Pendiente</span>
                    } @else {
                      <span class="badge synced">✓ Sincronizado</span>
                    }
                  </div>
                </div>

                <div class="ctrl-status">
                  @if (ctrl.onlineStatus === 'online') {
                    <span class="pill online">EN LÍNEA</span>
                  } @else {
                    <span class="pill offline">DESCONECTADO</span>
                  }

                  @if (ctrl.clockDriftMs > 2000) {
                    <span class="drift-alert" title="Deriva mayor a 2 segundos descalifica la auditoría NTP">
                      ⏱ Deriva de Reloj: {{ ctrl.clockDriftMs }} ms
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Gateway Security Principles Panel -->
        <section class="card">
          <h2>Principios del Gateway de Dispositivos</h2>
          <div class="principles-box">
            <div class="p-item">
              <h3>🔑 Un Certificado mTLS por Controlador</h3>
              <p>
                Cualquier intento de conexión sin certificado válido o con certificado revocado se rechaza en el broker EMQX. Si un dispositivo es robado, se revoca sin afectar a la red.
              </p>
            </div>

            <div class="p-item">
              <h3>📦 Ingesta Idempotente (<code>event_id</code>)</h3>
              <p>
                Los controladores bufferizan eventos durante desconexiones. Al reconectar, el gateway filtra duplicados mediante <code>event_id</code> garantizando store-and-forward sin pérdidas.
              </p>
            </div>

            <div class="p-item">
              <h3>⏱ Disciplina de Reloj NTP</h3>
              <p>
                El timestamp de auditoría exige precisión. Si la deriva entre el controlador y el servidor supera los 2000 ms, se emite una alerta crítica.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .gateway-container {
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

    .status-pill.mtls {
      background-color: var(--umbral-success-bg);
      color: var(--umbral-success);
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
      background-color: var(--umbral-surface);
      border-radius: 0.75rem;
      padding: 1.25rem;
      border: 1px solid var(--umbral-border);
    }

    h1, h2, h3 {
      margin-top: 0;
      color: var(--umbral-text);
    }

    .controller-item {
      background-color: var(--umbral-bg);
      border: 1px solid var(--umbral-border);
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;

      &.offline {
        border-color: var(--umbral-text-muted);
      }
    }

    .ctrl-info {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .ctrl-name {
      font-weight: 600;
      color: var(--umbral-text);
    }

    .ctrl-ip {
      font-size: 0.85rem;
      color: var(--umbral-text-muted);
      margin-left: 0.4rem;
    }

    .cert-thumb {
      font-size: 0.8rem;
      color: var(--umbral-text-faint);
    }

    .sync-info {
      font-size: 0.85rem;
      color: var(--umbral-text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.2rem;
    }

    .badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      font-weight: 600;
    }

    .badge.synced {
      background-color: var(--umbral-success-bg);
      color: var(--umbral-success);
    }

    .badge.push-needed {
      background-color: var(--umbral-warning-bg);
      color: var(--umbral-warning);
    }

    .ctrl-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.4rem;
    }

    .pill {
      padding: 0.3rem 0.6rem;
      border-radius: 0.25rem;
      font-weight: 700;
      font-size: 0.75rem;
    }

    .pill.online {
      background-color: var(--umbral-success-bg);
      color: var(--umbral-success);
    }

    .pill.offline {
      background-color: var(--umbral-border-strong);
      color: var(--umbral-text-muted);
    }

    .drift-alert {
      font-size: 0.75rem;
      color: var(--umbral-danger);
      font-weight: 600;
    }

    .principles-box {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .p-item {
      background-color: var(--umbral-bg);
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--umbral-border);

      p {
        margin-bottom: 0;
        font-size: 0.875rem;
        color: var(--umbral-text-muted);
        line-height: 1.4;
      }
    }
  `]
})
export class DeviceGatewayConsoleComponent {
  protected readonly controllers = signal<ControllerGatewayView[]>([
    {
      id: 'ctrl-101',
      name: 'Controlador iSTAR-01 (Torre Central)',
      ipAddress: '192.168.1.100',
      thumbprint: 'SHA256:A1B2C3D4E5F67890...',
      certificateStatus: 'active',
      onlineStatus: 'online',
      matrixVersion: 2,
      serverMatrixVersion: 2,
      clockDriftMs: 120,
    },
    {
      id: 'ctrl-102',
      name: 'Controlador iSTAR-02 (Parqueadero)',
      ipAddress: '192.168.1.101',
      thumbprint: 'SHA256:B987654321FEDCBA...',
      certificateStatus: 'active',
      onlineStatus: 'online',
      matrixVersion: 1,
      serverMatrixVersion: 2,
      clockDriftMs: 3400, // > 2000 ms
    }
  ]);
}
