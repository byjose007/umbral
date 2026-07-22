import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PersonView {
  id: string;
  fullName: string;
  nationalId: string;
  personType: 'employee' | 'contractor' | 'visitor';
  externalRef?: string | null;
  employmentStatus: 'active' | 'inactive';
  accessStatus: 'allowed' | 'blocked';
  blockReason?: string;
}

@Component({
  selector: 'app-identity-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="identity-container">
      <header class="top-header">
        <h1>UMBRAL — Gestión de Identidades y Ciclo Laboral</h1>
        <span class="status-pill active">● Motor de Estado Derivado Activo</span>
      </header>

      <main class="grid-layout">
        <!-- Person List Panel -->
        <section class="card">
          <h2>Personas e Identidades</h2>
          <div class="person-list">
            @for (person of persons(); track person.id) {
              <div class="person-item" [class.blocked]="person.accessStatus === 'blocked'">
                <div class="person-info">
                  <span class="person-name">{{ person.fullName }}</span>
                  <span class="person-meta">
                    Cédula/ID: {{ person.nationalId }} · Tipo: <strong class="capitalize">{{ person.personType }}</strong>
                    @if (person.externalRef) {
                      · HRIS: <code class="mono">{{ person.externalRef }}</code>
                    }
                  </span>
                </div>

                <div class="person-status">
                  @if (person.accessStatus === 'allowed') {
                    <span class="badge allowed">PERMITIDO</span>
                  } @else {
                    <span class="badge blocked" [title]="person.blockReason">
                      BLOQUEADO: {{ person.blockReason }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Derived Access Logic Explanation Panel -->
        <section class="card">
          <h2>Invariante: Estado de Acceso Derivado</h2>
          <div class="explanation-box">
            <p>
              En UMBRAL, el acceso de una persona es una <strong>función pura</strong> calculada automáticamente:
            </p>
            <div class="formula">
              <code>
                accessStatus = VínculoLaboralVigente(t)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AND NOT AusenciaBloqueanteVigente(t)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AND NOT DocumentoBloqueanteVencido(t)
              </code>
            </div>
            <ul>
              <li><strong>No es una bandera editable:</strong> Un operador no puede "encender" acceso a mano si existe una ausencia o un contrato vencido.</li>
              <li><strong>Sin borrado de histórico:</strong> Al desvincular a un empleado, el periodo de empleo se cierra y el histórico de accesos se preserva inmutable.</li>
              <li><strong>Reactivación automática:</strong> Al finalizar un periodo de vacaciones, la persona recupera su acceso sin intervención humana.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .identity-container {
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

    .status-pill.active {
      background-color: #064e3b;
      color: #34d399;
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

    h1, h2 {
      margin-top: 0;
      color: #f1f5f9;
    }

    .person-item {
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

    .person-info {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .person-name {
      font-weight: 600;
      color: #f8fafc;
    }

    .person-meta {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .capitalize {
      text-transform: capitalize;
    }

    .badge {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.3rem 0.6rem;
      border-radius: 0.25rem;
      font-weight: 700;
    }

    .badge.allowed {
      background-color: #064e3b;
      color: #6ee7b7;
    }

    .badge.blocked {
      background-color: #7f1d1d;
      color: #fca5a5;
    }

    .explanation-box {
      background-color: #0f172a;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid #334155;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .formula {
      background-color: #1e293b;
      padding: 0.75rem;
      border-radius: 0.375rem;
      margin: 1rem 0;
      color: #38bdf8;
      font-family: monospace;
    }

    .mono { font-family: monospace; }
  `]
})
export class IdentityConsoleComponent {
  protected readonly persons = signal<PersonView[]>([
    {
      id: 'p-1',
      fullName: 'Carlos Mendoza',
      nationalId: '0912345678',
      personType: 'employee',
      externalRef: 'HR-101',
      employmentStatus: 'active',
      accessStatus: 'allowed',
    },
    {
      id: 'p-2',
      fullName: 'Lucía Vera',
      nationalId: '0955443322',
      personType: 'employee',
      externalRef: 'HR-102',
      employmentStatus: 'active',
      accessStatus: 'blocked',
      blockReason: 'ABSENCE_ACTIVE (Vacaciones)',
    },
    {
      id: 'p-3',
      fullName: 'Jorge Ramírez',
      nationalId: '1788990011',
      personType: 'contractor',
      externalRef: 'HR-901',
      employmentStatus: 'active',
      accessStatus: 'blocked',
      blockReason: 'DOCUMENT_EXPIRED (Póliza de Riesgo Laboral)',
    }
  ]);
}
