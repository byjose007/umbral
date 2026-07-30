import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, of, switchMap } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';

interface PersonDto {
  id: string;
  siteId: string;
  personType: 'employee' | 'contractor' | 'visitor';
  firstName: string;
  lastName: string;
  nationalId: string;
  externalRef?: string | null;
}

interface PersonsPageDto {
  items: PersonDto[];
  total: number;
  page: number;
  pageSize: number;
}

interface AccessStatusDto {
  personId: string;
  status: 'allowed' | 'blocked';
  reasonCode?: string;
  message?: string;
}

export interface PersonView {
  id: string;
  fullName: string;
  nationalId: string;
  personType: 'employee' | 'contractor' | 'visitor';
  externalRef?: string | null;
  accessStatus: 'allowed' | 'blocked';
  blockReason?: string;
}

const PAGE_SIZE = 10;

@Component({
  selector: 'app-identity-console',
  standalone: true,
  template: `
    <div class="p-6">
      <header class="mb-6 flex items-center justify-between border-b border-border pb-4">
        <h1 class="text-xl font-semibold text-text">Gestión de Identidades y Ciclo Laboral</h1>
        <span class="rounded-full bg-success-bg px-3 py-1 text-sm font-semibold text-success">
          ● Motor de Estado Derivado Activo
        </span>
      </header>

      <main class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section class="rounded-lg border border-border bg-surface p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-base font-semibold text-text">Personas e Identidades</h2>
            @if (total() > 0) {
              <span class="text-sm text-text-muted">{{ total() }} en total</span>
            }
          </div>

          @if (isLoading()) {
            <p class="text-sm text-text-muted">Cargando personas…</p>
          } @else if (loadError()) {
            <p class="text-sm text-danger">{{ loadError() }}</p>
          } @else if (persons().length === 0) {
            <p class="text-sm text-text-muted">No hay personas registradas en este sitio todavía.</p>
          } @else {
            <div class="space-y-3">
              @for (person of persons(); track person.id) {
                <div
                  class="flex items-center justify-between rounded-md border px-4 py-3"
                  [class]="person.accessStatus === 'blocked' ? 'border-danger bg-bg' : 'border-border bg-bg'"
                >
                  <div class="flex flex-col gap-1">
                    <span class="font-medium text-text">{{ person.fullName }}</span>
                    <span class="text-sm text-text-muted">
                      Cédula/ID: {{ person.nationalId }} · Tipo:
                      <strong class="capitalize">{{ person.personType }}</strong>
                      @if (person.externalRef) {
                        · HRIS: <code class="font-mono">{{ person.externalRef }}</code>
                      }
                    </span>
                  </div>

                  <div>
                    @if (person.accessStatus === 'allowed') {
                      <span class="rounded bg-success-bg px-2 py-1 text-xs font-bold text-success">
                        PERMITIDO
                      </span>
                    } @else {
                      <span
                        class="rounded bg-danger-bg px-2 py-1 text-xs font-bold text-danger"
                        [title]="person.blockReason"
                      >
                        BLOQUEADO: {{ person.blockReason }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>

            @if (totalPages() > 1) {
              <div class="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  class="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40"
                  [disabled]="page() <= 1"
                  (click)="loadPage(page() - 1)"
                >
                  ← Anterior
                </button>
                <span class="text-sm text-text-muted">Página {{ page() }} de {{ totalPages() }}</span>
                <button
                  type="button"
                  class="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40"
                  [disabled]="page() >= totalPages()"
                  (click)="loadPage(page() + 1)"
                >
                  Siguiente →
                </button>
              </div>
            }
          }
        </section>

        <section class="rounded-lg border border-border bg-surface p-5">
          <h2 class="mb-3 text-base font-semibold text-text">Invariante: Estado de Acceso Derivado</h2>
          <div class="rounded-md border border-border bg-bg p-4 text-sm leading-relaxed text-text-muted">
            <p>
              En UMBRAL, el acceso de una persona es una <strong class="text-text">función pura</strong>
              calculada automáticamente:
            </p>
            <div class="my-4 rounded-md border border-border bg-surface-2 p-3 font-mono text-sm text-teal">
              accessStatus = VínculoLaboralVigente(t)<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AND NOT
              AusenciaBloqueanteVigente(t)<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;AND NOT
              DocumentoBloqueanteVencido(t)
            </div>
            <ul class="list-disc space-y-2 pl-5">
              <li>
                <strong class="text-text">No es una bandera editable:</strong> un operador no puede
                "encender" acceso a mano si existe una ausencia o un contrato vencido.
              </li>
              <li>
                <strong class="text-text">Sin borrado de histórico:</strong> al desvincular a un empleado,
                el periodo de empleo se cierra y el histórico de accesos se preserva inmutable.
              </li>
              <li>
                <strong class="text-text">Reactivación automática:</strong> al finalizar un periodo de
                vacaciones, la persona recupera su acceso sin intervención humana.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  `,
})
export class IdentityConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly persons = signal<PersonView[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  ngOnInit(): void {
    this.loadPage(1);
  }

  protected loadPage(page: number): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.http
      .get<PersonsPageDto>(`${API_BASE_URL}/identity/persons`, {
        params: { page: String(page), pageSize: String(PAGE_SIZE) },
      })
      .pipe(
        switchMap((pageResult) => {
          if (pageResult.items.length === 0) {
            return of({ pageResult, statuses: [] as AccessStatusDto[] });
          }
          return this.http
            .post<AccessStatusDto[]>(`${API_BASE_URL}/identity/access-status/batch`, {
              personIds: pageResult.items.map((p) => p.id),
            })
            .pipe(map((statuses) => ({ pageResult, statuses })));
        }),
      )
      .subscribe({
        next: ({ pageResult, statuses }) => {
          const statusByPersonId = new Map(statuses.map((s) => [s.personId, s]));
          this.persons.set(
            pageResult.items.map((person) => this.toView(person, statusByPersonId.get(person.id))),
          );
          this.total.set(pageResult.total);
          this.page.set(pageResult.page);
          this.isLoading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la lista de personas desde el backend.');
          this.isLoading.set(false);
        },
      });
  }

  private toView(person: PersonDto, status?: AccessStatusDto): PersonView {
    return {
      id: person.id,
      fullName: `${person.firstName} ${person.lastName}`,
      nationalId: person.nationalId,
      personType: person.personType,
      externalRef: person.externalRef,
      accessStatus: status?.status ?? 'blocked',
      blockReason: status?.reasonCode ? `${status.reasonCode} — ${status.message}` : undefined,
    };
  }
}
