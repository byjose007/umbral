import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_BASE_URL } from '../api-base-url';
import { Operator, OperatorRole } from '../auth/models';
import { ToastService } from '../shared/ui/toast.service';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';
import { ModalComponent } from '../shared/ui/modal.component';

const ROLE_OPTIONS: { value: OperatorRole; label: string }[] = [
  { value: 'guardia', label: 'Guardia de Seguridad (PWA Garita)' },
  { value: 'admin', label: 'Administrador (Consola Web)' },
  { value: 'supervisor', label: 'Supervisor de Operaciones' },
  { value: 'auditor', label: 'Auditor (Solo Lectura)' },
];

interface CreateOperatorForm {
  fullName: string;
  email: string;
  password: string;
  role: OperatorRole;
  siteId: string;
}

@Component({
  selector: 'app-operators-console',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, StatusBadgeComponent, ModalComponent],
  template: `
    <div class="p-6">
      <app-page-header
        title="Personal de Garita y Administradores"
        subtitle="Cuentas administrativas (Consola Web) y personal operativo (PWA de Garita para escanear pases)."
      />

      <!-- Banner de orientación UX -->
      <div class="mb-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-text flex items-center justify-between gap-4">
        <div>
          <strong class="text-accent font-semibold">¿Buscas registrar un usuario para que use el Pase QR en su móvil (Empleado, Contratista, Cliente, Invitado)?</strong>
          <p class="mt-1 text-xs text-text-muted">
            Esas personas <strong>no se registran aquí</strong>. Ve a <strong>"Usuarios y Pases Móviles"</strong> en el menú lateral. Esta sección es exclusiva para crear cuentas a <strong>Guardias / Recepción</strong> y <strong>Administradores de la consola</strong>.
          </p>
        </div>
        <a routerLink="/identity" class="shrink-0 rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-text hover:bg-accent-hover no-underline">
          Ir a Usuarios QR →
        </a>
      </div>

      @if (loadError()) {
        <p class="text-sm text-danger">{{ loadError() }}</p>
      } @else {
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <section class="min-w-0 rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Cuentas Registradas</h2>

            @if (isLoading()) {
              <p class="text-sm text-text-muted">Cargando…</p>
            } @else if (operators().length === 0) {
              <p class="text-sm text-text-muted">No hay operadores todavía.</p>
            } @else {
              <div class="u-table-wrap">
                <table class="u-table">
                  <thead>
                    <tr>
                      <th>Operador</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (op of operators(); track op.id) {
                      <tr>
                        <td>
                          <div class="font-medium text-text">{{ op.fullName }}</div>
                          <div class="text-xs text-text-muted">{{ op.email }}</div>
                        </td>
                        <td>
                          <select
                            class="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-text capitalize"
                            [value]="op.role"
                            (change)="onRoleChange(op, $any($event.target).value)"
                          >
                            @for (opt of roleOptions; track opt.value) {
                              <option [value]="opt.value">{{ opt.label }}</option>
                            }
                          </select>
                        </td>
                        <td>
                          @if (op.status === 'active') {
                            <app-status-badge tone="success">ACTIVO</app-status-badge>
                          } @else {
                            <app-status-badge tone="danger">DESHABILITADO</app-status-badge>
                          }
                        </td>
                        <td>
                          <div class="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              class="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
                              (click)="onToggleStatus(op)"
                            >
                              {{ op.status === 'active' ? 'Deshabilitar' : 'Habilitar' }}
                            </button>

                            <button
                              type="button"
                              class="rounded-md border border-border px-3 py-1.5 text-sm text-accent hover:bg-surface-hover"
                              (click)="onResetPassword(op)"
                            >
                              Resetear clave
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <app-modal
              [open]="!!resetModalData()"
              title="Contraseña temporal generada"
              (closed)="resetModalData.set(null)"
            >
              <p class="text-sm text-text-muted mb-4">
                Entrega esta clave temporal al operador <strong>{{ resetModalData()?.fullName }}</strong>. Deberá usarla para iniciar sesión en la PWA de garita.
              </p>
              <div class="mb-4 rounded-md border border-accent bg-surface-2 p-3 text-center font-mono text-lg font-bold text-accent">
                {{ resetModalData()?.temporaryPassword }}
              </div>
              <button
                type="button"
                class="w-full rounded-md bg-accent py-2 font-medium text-accent-text hover:bg-accent-hover"
                (click)="resetModalData.set(null)"
              >
                Entendido / cerrar
              </button>
            </app-modal>
          </section>

          <section class="rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Nuevo Operador</h2>
            <form (submit)="onCreate($event)">
              <label class="block text-sm text-text-muted mb-1">Nombre completo</label>
              <input
                class="w-full mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                placeholder="Ej: Juan Perez (Guardia)"
                [value]="form.fullName"
                (input)="form.fullName = $any($event.target).value"
              />

              <label class="block text-sm text-text-muted mb-1">Correo</label>
              <input
                type="email"
                class="w-full mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                placeholder="juan@umbral.local"
                [value]="form.email"
                (input)="form.email = $any($event.target).value"
              />

              <label class="block text-sm text-text-muted mb-1">Contraseña (Mín. 6 caracteres)</label>
              <input
                type="password"
                class="w-full mb-1 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                placeholder="Dejar en blanco para auto-generar"
                [value]="form.password"
                (input)="form.password = $any($event.target).value"
              />
              <p class="text-xs text-text-muted mb-3">Si la dejas vacía, se creará una clave de un solo uso.</p>

              <label class="block text-sm text-text-muted mb-1">Rol</label>
              <select
                class="w-full mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                [value]="form.role"
                (change)="form.role = $any($event.target).value"
              >
                @for (opt of roleOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>

              <label class="block text-sm text-text-muted mb-1">Sitio</label>
              <input
                class="w-full mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                [value]="form.siteId"
                (input)="form.siteId = $any($event.target).value"
              />

              @if (formError()) {
                <p class="mb-3 text-sm text-danger">{{ formError() }}</p>
              }

              <button
                type="submit"
                class="w-full rounded-md bg-accent py-2 font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
                [disabled]="isSubmitting()"
              >
                {{ isSubmitting() ? 'Creando…' : 'Crear Operador' }}
              </button>
            </form>
          </section>
        </div>
      }
    </div>
  `,
})
export class OperatorsConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly operators = signal<Operator[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly resetModalData = signal<{ fullName: string; temporaryPassword: string } | null>(null);

  protected form: CreateOperatorForm = {
    fullName: '',
    email: '',
    password: '',
    role: 'guardia',
    siteId: 'site-default',
  };

  ngOnInit(): void {
    this.loadOperators();
  }

  private loadOperators(): void {
    this.isLoading.set(true);
    this.http.get<Operator[]>(`${API_BASE_URL}/auth/operators`).subscribe({
      next: (operators) => {
        this.operators.set(operators);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(
          err.status === 403
            ? 'No tienes permiso de administrador para ver esta página.'
            : 'No se pudo cargar la lista de operadores.',
        );
        this.isLoading.set(false);
      },
    });
  }

  onCreate(event: Event): void {
    event.preventDefault();
    this.formError.set(null);

    if (!this.form.fullName.trim()) {
      this.formError.set('Ingresa el nombre completo del operador.');
      return;
    }
    if (!this.form.email.trim() || !this.form.email.includes('@')) {
      this.formError.set('Ingresa un correo electrónico válido.');
      return;
    }
    if (!this.form.password) {
      this.form.password = `Tmp-${Math.floor(100000 + Math.random() * 900000)}`;
    } else if (this.form.password.length < 6) {
      this.formError.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.isSubmitting.set(true);

    this.http.post<Operator>(`${API_BASE_URL}/auth/operators`, this.form).subscribe({
      next: (operator) => {
        this.operators.update((prev) => [...prev, operator]);
        this.form = { fullName: '', email: '', password: '', role: 'guardia', siteId: 'site-default' };
        this.isSubmitting.set(false);
        this.toastService.success(`Operador "${operator.fullName}" creado.`);
      },
      error: (err: HttpErrorResponse) => {
        let msg = 'No se pudo crear el operador.';
        const errPayload = err.error;
        if (typeof errPayload?.message === 'string') {
          msg = errPayload.message;
        } else if (Array.isArray(errPayload?.message)) {
          msg = errPayload.message.map((m: any) => (typeof m === 'string' ? m : m.message ?? JSON.stringify(m))).join(', ');
        } else if (Array.isArray(errPayload?.errors)) {
          msg = errPayload.errors.map((e: any) => `${e.path?.join('.') ?? ''}: ${e.message}`).join(', ');
        }
        this.formError.set(msg);
        this.isSubmitting.set(false);
      },
    });
  }

  onRoleChange(operator: Operator, role: OperatorRole): void {
    this.http
      .patch<Operator>(`${API_BASE_URL}/auth/operators/${operator.id}`, { role })
      .subscribe({
        next: (updated) => {
          this.replaceOperator(updated);
          this.toastService.success(`Rol de ${updated.fullName} actualizado a ${updated.role}.`);
        },
        error: () => {
          this.toastService.error('No se pudo cambiar el rol.');
          this.loadOperators();
        },
      });
  }

  onToggleStatus(operator: Operator): void {
    const status = operator.status === 'active' ? 'disabled' : 'active';
    this.http
      .patch<Operator>(`${API_BASE_URL}/auth/operators/${operator.id}`, { status })
      .subscribe({
        next: (updated) => {
          this.replaceOperator(updated);
          this.toastService.success(
            updated.status === 'active'
              ? `${updated.fullName} habilitado.`
              : `${updated.fullName} deshabilitado.`,
          );
        },
        error: () => {
          this.toastService.error('No se pudo cambiar el estado.');
          this.loadOperators();
        },
      });
  }

  onResetPassword(operator: Operator): void {
    this.http
      .post<{ id: string; fullName: string; temporaryPassword: string }>(
        `${API_BASE_URL}/auth/operators/${operator.id}/reset-password`,
        {},
      )
      .subscribe({
        next: (res) => {
          this.resetModalData.set({
            fullName: res.fullName,
            temporaryPassword: res.temporaryPassword,
          });
          this.toastService.success(`Contraseña reseteada para ${operator.fullName}.`);
        },
        error: () => {
          this.toastService.error('No se pudo resetear la contraseña.');
        },
      });
  }

  private replaceOperator(updated: Operator): void {
    this.operators.update((prev) => prev.map((op) => (op.id === updated.id ? updated : op)));
  }
}

