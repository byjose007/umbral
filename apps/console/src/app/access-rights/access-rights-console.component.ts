import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AccessLevelView {
  id: string;
  name: string;
  doorName: string;
  scheduleName: string;
  timeWindow: string;
}

export interface GroupView {
  id: string;
  name: string;
  assignedCount: number;
  accessLevels: string[];
}

@Component({
  selector: 'app-access-rights-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="access-rights-container">
      <header class="top-header">
        <h1>UMBRAL — Niveles de Acceso, Horarios y Grupos</h1>
        <span class="status-pill active">● Matriz (Puerta × Horario) Activa</span>
      </header>

      <main class="grid-layout">
        <!-- Access Levels Panel -->
        <section class="card">
          <h2>Niveles de Acceso (Matriz Puerta × Horario)</h2>
          <div class="al-list">
            @for (al of accessLevels(); track al.id) {
              <div class="al-item">
                <div class="al-info">
                  <span class="al-name">{{ al.name }}</span>
                  <span class="al-detail">
                    Puerta: <strong>{{ al.doorName }}</strong> · Horario: <span class="tag">{{ al.scheduleName }}</span>
                  </span>
                  <span class="window-info">Ventanas: {{ al.timeWindow }}</span>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Groups & Assignments Panel -->
        <section class="card">
          <h2>Grupos y Asignaciones con Vigencia</h2>
          <div class="group-list">
            @for (grp of groups(); track grp.id) {
              <div class="group-item">
                <div class="group-info">
                  <span class="group-name">{{ grp.name }}</span>
                  <span class="group-meta">
                    Personas asignadas: {{ grp.assignedCount }} · Niveles: {{ grp.accessLevels.join(', ') }}
                  </span>
                </div>
                <span class="badge time-effective">Vigencia Efectiva</span>
              </div>
            }
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .access-rights-container {
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

    .al-item, .group-item {
      background-color: #0f172a;
      border: 1px solid #334155;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .al-info, .group-info {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .al-name, .group-name {
      font-weight: 600;
      color: #f8fafc;
    }

    .al-detail, .group-meta {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .tag {
      color: #38bdf8;
      font-weight: 600;
    }

    .window-info {
      font-size: 0.8rem;
      color: #64748b;
      font-family: monospace;
    }

    .badge {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.3rem 0.6rem;
      border-radius: 0.25rem;
      font-weight: 700;
    }

    .badge.time-effective {
      background-color: #1e3a8a;
      color: #93c5fd;
    }
  `]
})
export class AccessRightsConsoleComponent {
  protected readonly accessLevels = signal<AccessLevelView[]>([
    {
      id: 'al-1',
      name: 'Acceso Oficina Central (L-V)',
      doorName: 'SCN Room 9153',
      scheduleName: 'Horario Laboral (07:00 - 19:00)',
      timeWindow: 'L, M, X, J, V [07:00 - 19:00]',
    },
    {
      id: 'al-2',
      name: 'Acceso Parqueadero 24/7',
      doorName: 'Barrera Vehicular',
      scheduleName: 'Siempre Permitido (24/7)',
      timeWindow: 'L - D [00:00 - 23:59]',
    }
  ]);

  protected readonly groups = signal<GroupView[]>([
    {
      id: 'grp-1',
      name: 'Personal Administrativo',
      assignedCount: 45,
      accessLevels: ['Acceso Oficina Central (L-V)', 'Acceso Parqueadero 24/7'],
    },
    {
      id: 'grp-2',
      name: 'Contratistas TI (Proyecto Temporal)',
      assignedCount: 8,
      accessLevels: ['Acceso Oficina Central (L-V)'],
    }
  ]);
}
