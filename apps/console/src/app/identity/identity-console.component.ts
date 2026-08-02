import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, of, switchMap } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { ToastService } from '../shared/ui/toast.service';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';
import { ModalComponent } from '../shared/ui/modal.component';
import { PaginationComponent } from '../shared/ui/pagination.component';

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
  imports: [PageHeaderComponent, StatusBadgeComponent, ModalComponent, PaginationComponent],
  template: `
    <div class="p-6">
      <app-page-header
        title="Directorio de Usuarios y Pases Móviles"
        subtitle="Empleados, contratistas y visitantes que utilizan la app User Pass en su móvil."
      >
        <app-status-badge status tone="success">● Motor de Estado Derivado Activo</app-status-badge>
      </app-page-header>

      <main class="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <section class="min-w-0 rounded-lg border border-border bg-surface p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-base font-semibold text-text">Usuarios de Pase QR</h2>
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
            <div class="u-table-wrap">
              <table class="u-table">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (person of persons(); track person.id) {
                    <tr>
                      <td>
                        <div class="font-medium text-text">{{ person.fullName }}</div>
                        <div class="text-xs text-text-muted">
                          Cédula/ID: {{ person.nationalId }}
                          @if (person.externalRef) {
                            · HRIS: <code class="font-mono">{{ person.externalRef }}</code>
                          }
                        </div>
                      </td>
                      <td class="capitalize">{{ person.personType }}</td>
                      <td>
                        @if (person.accessStatus === 'allowed') {
                          <app-status-badge tone="success">PERMITIDO</app-status-badge>
                        } @else {
                          <app-status-badge tone="danger" [attr.title]="person.blockReason">BLOQUEADO</app-status-badge>
                        }
                      </td>
                      <td>
                        <div class="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-accent hover:bg-surface-hover"
                            (click)="onGenerateActivation(person)"
                          >
                            Código activación
                          </button>
                          <button
                            type="button"
                            class="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-danger hover:bg-surface-hover"
                            (click)="onRevokePass(person)"
                          >
                            Revocar pase
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <app-modal
              [open]="!!activationModalData()"
              title="Código de activación de pase"
              (closed)="activationModalData.set(null)"
            >
              <p class="text-sm text-text-muted mb-4">
                Entrega este código de 6 dígitos a <strong>{{ activationModalData()?.fullName }}</strong>. Deberá introducirlo en su PWA de Usuario para crear su PIN personal de 4 dígitos.
              </p>
              <div class="mb-4 rounded-md border border-accent bg-surface-2 p-3 text-center font-mono text-2xl font-bold tracking-widest text-accent">
                {{ activationModalData()?.code }}
              </div>
              <p class="text-xs text-text-muted mb-4">Válido por 24 horas. Código de un solo uso.</p>
              <button
                type="button"
                class="w-full rounded-md bg-accent py-2 font-medium text-accent-text hover:bg-accent-hover"
                (click)="activationModalData.set(null)"
              >
                Entendido / cerrar
              </button>
            </app-modal>

            <app-pagination
              [page]="page()"
              [totalPages]="totalPages()"
              (pageChange)="loadPage($event)"
            />
          }
        </section>

        <section class="flex flex-col gap-6">
          <div class="rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Registrar Nueva Persona</h2>
            <form (submit)="onCreatePerson($event)">
              <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-sm text-text-muted mb-1">Nombre</label>
                  <input
                    class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    [value]="form.firstName"
                    (input)="form.firstName = $any($event.target).value"
                    placeholder="Byron José"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm text-text-muted mb-1">Apellidos</label>
                  <input
                    class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    [value]="form.lastName"
                    (input)="form.lastName = $any($event.target).value"
                    placeholder="López"
                    required
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-sm text-text-muted mb-1">Cédula / ID Nacional</label>
                  <input
                    class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                    [value]="form.nationalId"
                    (input)="form.nationalId = $any($event.target).value"
                    placeholder="12345678-9"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm text-text-muted mb-1">Tipo de Usuario (Perfil de Acceso)</label>
                  <select
                    class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                    [value]="form.personType"
                    (change)="form.personType = $any($event.target).value"
                  >
                    <option value="employee">Empleado / Personal Fijo</option>
                    <option value="contractor">Contratista / Proveedor / Cliente</option>
                    <option value="visitor">Invitado / Visita Ocasional</option>
                  </select>
                </div>
              </div>

              <div class="mb-3">
                <label class="block text-sm text-text-muted mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                  [value]="form.email"
                  (input)="form.email = $any($event.target).value"
                  placeholder="usuario@empresa.com"
                />
              </div>

              @if (formError()) {
                <p class="mb-3 text-sm text-danger">{{ formError() }}</p>
              }

              <button
                type="submit"
                class="w-full rounded-md bg-accent py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                [disabled]="isSubmitting()"
              >
                {{ isSubmitting() ? 'Registrando…' : 'Registrar Persona' }}
              </button>
            </form>
          </div>

          <div class="rounded-lg border border-border bg-surface p-5">
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
          </div>
        </section>
      </main>
    </div>
  `,
})
export class IdentityConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  protected readonly persons = signal<PersonView[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly activationModalData = signal<{ fullName: string; code: string } | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  protected form = {
    firstName: '',
    lastName: '',
    nationalId: '',
    personType: 'employee' as 'employee' | 'contractor' | 'visitor',
    email: '',
    siteId: 'site-default',
  };

  ngOnInit(): void {
    this.loadPage(1);
  }

  onCreatePerson(event: Event): void {
    event.preventDefault();
    this.formError.set(null);
    this.isSubmitting.set(true);

    this.http
      .post<PersonDto>(`${API_BASE_URL}/identity/persons`, this.form)
      .pipe(
        switchMap((created) =>
          this.http.post(`${API_BASE_URL}/identity/employment-periods`, {
            personId: created.id,
            contractType: 'full_time',
            validFrom: new Date().toISOString(),
            jobTitle: 'Personal Registrado',
            department: 'Operaciones',
          }).pipe(map(() => created))
        ),
      )
      .subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.form = {
            firstName: '',
            lastName: '',
            nationalId: '',
            personType: 'employee',
            email: '',
            siteId: 'site-default',
          };
          this.toastService.success(`Persona "${created.firstName} ${created.lastName}" registrada con acceso activo.`);
          this.loadPage(1);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.formError.set(err?.error?.message ?? 'No se pudo registrar a la persona.');
        },
      });
  }

  onGenerateActivation(person: PersonView): void {
    this.http
      .post<{ personId: string; activationCode: string }>(
        `${API_BASE_URL}/user-pass/generate-activation`,
        { personId: person.id },
      )
      .subscribe({
        next: (res) => {
          this.activationModalData.set({
            fullName: person.fullName,
            code: res.activationCode,
          });
          this.toastService.success(`Código de activación generado para ${person.fullName}.`);
        },
        error: () => {
          this.toastService.error('No se pudo generar el código de activación.');
        },
      });
  }

  onRevokePass(person: PersonView): void {
    this.http
      .post<{ personId: string; newActivationCode: string }>(
        `${API_BASE_URL}/user-pass/revoke`,
        { personId: person.id },
      )
      .subscribe({
        next: (res) => {
          this.activationModalData.set({
            fullName: person.fullName,
            code: res.newActivationCode,
          });
          this.toastService.success(`Pase revocado para ${person.fullName}. Nuevo código generado.`);
        },
        error: () => {
          this.toastService.error('No se pudo revocar el pase.');
        },
      });
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
