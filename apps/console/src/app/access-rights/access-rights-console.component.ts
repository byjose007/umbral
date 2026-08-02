import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';

interface AccessLevelDto {
  id: string;
  name: string;
  description?: string;
  entries: { doorId: string; scheduleId: string }[];
}

interface GroupDto {
  id: string;
  name: string;
  description?: string;
  accessLevelIds: string[];
}

interface ScheduleDto {
  id: string;
  name: string;
}

interface DoorDto {
  hierarchicalName: string;
  door: { props: { id: string } };
}

export interface AccessLevelView {
  id: string;
  name: string;
  description?: string;
  entries: { doorName: string; scheduleName: string }[];
}

export interface GroupView {
  id: string;
  name: string;
  description?: string;
  accessLevelNames: string[];
}

@Component({
  selector: 'app-access-rights-console',
  standalone: true,
  imports: [PageHeaderComponent, StatusBadgeComponent],
  template: `
    <div class="p-6">
      <app-page-header
        title="Niveles de Acceso, Horarios y Grupos"
        subtitle="Matriz puerta × horario que define qué puede abrir cada grupo de personas y cuándo."
      >
        <app-status-badge status tone="success">● Matriz conectada al backend</app-status-badge>
      </app-page-header>

      @if (loadError()) {
        <p class="text-sm text-danger">{{ loadError() }}</p>
      } @else {
        <main class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section class="min-w-0 rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Niveles de Acceso</h2>
            @if (isLoading()) {
              <p class="text-sm text-text-muted">Cargando…</p>
            } @else if (accessLevels().length === 0) {
              <p class="text-sm text-text-muted">No hay niveles de acceso registrados todavía.</p>
            } @else {
              <div class="u-table-wrap">
                <table class="u-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Entradas (puerta × horario)</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (al of accessLevels(); track al.id) {
                      <tr>
                        <td>
                          <div class="font-medium text-text">{{ al.name }}</div>
                          @if (al.description) {
                            <div class="text-xs text-text-muted">{{ al.description }}</div>
                          }
                        </td>
                        <td>
                          <div class="flex flex-wrap gap-1.5">
                            @for (entry of al.entries; track entry.doorName + entry.scheduleName) {
                              <app-status-badge tone="info">{{ entry.doorName }} · {{ entry.scheduleName }}</app-status-badge>
                            }
                            @empty {
                              <span class="text-xs text-text-faint">Sin entradas configuradas</span>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="min-w-0 rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Grupos y Asignaciones</h2>
            @if (isLoading()) {
              <p class="text-sm text-text-muted">Cargando…</p>
            } @else if (groups().length === 0) {
              <p class="text-sm text-text-muted">No hay grupos registrados todavía.</p>
            } @else {
              <div class="u-table-wrap">
                <table class="u-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Niveles de acceso</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (grp of groups(); track grp.id) {
                      <tr>
                        <td>
                          <div class="font-medium text-text">{{ grp.name }}</div>
                          @if (grp.description) {
                            <div class="text-xs text-text-muted">{{ grp.description }}</div>
                          }
                        </td>
                        <td>
                          <div class="flex flex-wrap gap-1.5">
                            @for (name of grp.accessLevelNames; track name) {
                              <app-status-badge tone="neutral">{{ name }}</app-status-badge>
                            }
                            @empty {
                              <span class="text-xs text-text-faint">Sin niveles asignados</span>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>
        </main>
      }
    </div>
  `,
})
export class AccessRightsConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly accessLevels = signal<AccessLevelView[]>([]);
  protected readonly groups = signal<GroupView[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      accessLevels: this.http.get<AccessLevelDto[]>(`${API_BASE_URL}/access-rights/access-levels`),
      groups: this.http.get<GroupDto[]>(`${API_BASE_URL}/access-rights/groups`),
      schedules: this.http.get<ScheduleDto[]>(`${API_BASE_URL}/access-rights/schedules`),
      doors: this.http.get<DoorDto[]>(`${API_BASE_URL}/topology/doors`),
    }).subscribe({
      next: ({ accessLevels, groups, schedules, doors }) => {
        const scheduleNameById = new Map(schedules.map((s) => [s.id, s.name]));
        const doorNameById = new Map(doors.map((d) => [d.door.props.id, d.hierarchicalName]));
        const accessLevelNameById = new Map(accessLevels.map((al) => [al.id, al.name]));

        this.accessLevels.set(
          accessLevels.map((al) => ({
            id: al.id,
            name: al.name,
            description: al.description,
            entries: al.entries.map((e) => ({
              doorName: doorNameById.get(e.doorId) ?? 'Puerta desconocida',
              scheduleName: scheduleNameById.get(e.scheduleId) ?? 'Horario desconocido',
            })),
          })),
        );

        this.groups.set(
          groups.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            accessLevelNames: g.accessLevelIds.map(
              (id) => accessLevelNameById.get(id) ?? 'Nivel desconocido',
            ),
          })),
        );

        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('No se pudo cargar la matriz de niveles de acceso desde el backend.');
        this.isLoading.set(false);
      },
    });
  }
}
