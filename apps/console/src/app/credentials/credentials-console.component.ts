import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CredentialView {
  id: string;
  personName: string;
  credentialType: string;
  credentialHash: string; // SHA-256 preview
  status: 'active' | 'blocked' | 'expired';
  blockReason?: string | null;
}

@Component({
  selector: 'app-credentials-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="credentials-container">
      <header class="top-header">
        <h1>UMBRAL — Emisión y Ciclo de Vida de Credenciales</h1>
        <span class="status-pill secure">🔒 Almacenamiento en Hash Inreversible (SHA-256)</span>
      </header>

      <main class="grid-layout">
        <!-- Credential List Panel -->
        <section class="card">
          <h2>Credenciales Emitidas</h2>
          <div class="credential-list">
            @for (cred of credentials(); track cred.id) {
              <div class="credential-item" [class.blocked]="cred.status === 'blocked'">
                <div class="cred-info">
                  <span class="person-name">{{ cred.personName }}</span>
                  <span class="type-tag">{{ cred.credentialType }}</span>
                  <span class="hash-preview" title="Número en claro nunca almacenado">
                    Hash: <code>{{ cred.credentialHash.substring(0, 16) }}...</code>
                  </span>
                </div>

                <div class="cred-status">
                  @if (cred.status === 'active') {
                    <span class="badge active">ACTIVA</span>
                    <button class="btn btn-block" (click)="blockCredential(cred)">Bloquear</button>
                  } @else {
                    <span class="badge blocked" [title]="cred.blockReason">
                      BLOQUEADA: {{ cred.blockReason }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </section>

        <!-- QR Dynamic & Duress Info Panel -->
        <section class="card">
          <h2>Mecanismos de Seguridad Integrados</h2>
          <div class="info-box">
            <div class="sec-item">
              <h3>📱 QR Dinámico Firmado (ES256)</h3>
              <p>
                Los códigos QR rotan periódicamente con un nonce único. La PWA del guardia
                verifica la firma digital localmente sin requerir conexión al servidor.
              </p>
            </div>

            <div class="sec-item">
              <h3>🚨 Código de Coacción (Duress PIN)</h3>
              <p>
                En situaciones de secuestro o amenaza, el usuario introduce su PIN de coacción.
                El sistema concede el acceso para proteger su vida pero genera de inmediato una
                alerta crítica silenciosa al centro de monitoreo.
              </p>
            </div>

            <div class="sec-item">
              <h3>🚫 Prohibición de Tecnologías Clonables</h3>
              <p>
                Se prohíben 125 kHz y MIFARE Classic. Se adopta DESFire EV2/EV3 y mTLS como estándar.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .credentials-container {
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

    .status-pill.secure {
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

    h1, h2, h3 {
      margin-top: 0;
      color: #f1f5f9;
    }

    .credential-item {
      background-color: #0f172a;
      border: 1px solid #334155;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;

      &.blocked {
        border-color: #ef4444;
      }
    }

    .cred-info {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .person-name {
      font-weight: 600;
      color: #f8fafc;
    }

    .type-tag {
      font-size: 0.8rem;
      color: #38bdf8;
      font-weight: 600;
    }

    .hash-preview {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .badge {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.3rem 0.6rem;
      border-radius: 0.25rem;
      font-weight: 700;
      margin-right: 0.5rem;
    }

    .badge.active {
      background-color: #064e3b;
      color: #6ee7b7;
    }

    .badge.blocked {
      background-color: #7f1d1d;
      color: #fca5a5;
    }

    .btn-block {
      background-color: #dc2626;
      color: white;
      border: none;
      padding: 0.35rem 0.7rem;
      border-radius: 0.25rem;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .info-box {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .sec-item {
      background-color: #0f172a;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid #334155;

      p {
        margin-bottom: 0;
        font-size: 0.875rem;
        color: #cbd5e1;
        line-height: 1.4;
      }
    }
  `]
})
export class CredentialsConsoleComponent {
  protected readonly credentials = signal<CredentialView[]>([
    {
      id: 'c-1',
      personName: 'Carlos Mendoza',
      credentialType: 'MIFARE DESFire EV3',
      credentialHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      status: 'active',
    },
    {
      id: 'c-2',
      personName: 'Carlos Mendoza',
      credentialType: 'QR Dinámico (PWA)',
      credentialHash: 'f9e8d7c6b5a43210987654321fedcba0987654321fedcba0987654321fedcba0',
      status: 'active',
    },
    {
      id: 'c-3',
      personName: 'Lucía Vera',
      credentialType: 'MIFARE DESFire EV2',
      credentialHash: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
      status: 'blocked',
      blockReason: 'Tarjeta extraviada en recepción',
    }
  ]);

  protected blockCredential(cred: CredentialView): void {
    cred.status = 'blocked';
    cred.blockReason = 'Bloqueada manualmente desde consola';
  }
}
