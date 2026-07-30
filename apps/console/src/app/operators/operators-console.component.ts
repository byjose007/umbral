import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url';
import { Operator, OperatorRole } from '../auth/models';
import { ToastService } from '../shared/ui/toast.service';

const ROLE_OPTIONS: OperatorRole[] = ['admin', 'supervisor', 'guardia', 'auditor'];

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
  template: `
    <div class="p-6">
      <header class="mb-6 border-b border-border pb-4">
        <h1 class="text-xl font-semibold text-text">Operadores del Sistema</h1>
        <p class="mt-1 text-sm text-text-muted">
          Cuentas con acceso a la consola y a la PWA de garita. Solo administradores
          pueden crear operadores o cambiar su rol/estado.
        </p>
      </header>

      @if (loadError()) {
        <p class="text-sm text-danger">{{ loadError() }}</p>
      } @else {
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <section class="rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Operadores</h2>

            @if (isLoading()) {
              <p class="text-sm text-text-muted">Cargando…</p>
            } @else if (operators().length === 0) {
              <p class="text-sm text-text-muted">No hay operadores todavía.</p>
            } @else {
              <div class="space-y-3">
                @for (op of operators(); track op.id) {
                  <div class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-bg px-4 py-3">
                    <div class="flex flex-col gap-1">
                      <span class="font-medium text-text">{{ op.fullName }}</span>
                      <span class="text-sm text-text-muted">{{ op.email }}</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <select
                        class="rounded-md border border-border bg-surface-2 px-2 py-1 text-sm text-text capitalize"
                        [value]="op.role"
                        (change)="onRoleChange(op, $any($event.target).value)"
                      >
                        @for (role of roleOptions; track role) {
                          <option [value]="role">{{ role }}</option>
                        }
                      </select>

                      @if (op.status === 'active') {
                        <span class="rounded bg-success-bg px-2 py-1 text-xs font-bold text-success">
                          ACTIVO
                        </span>
                      } @else {
                        <span class="rounded bg-danger-bg px-2 py-1 text-xs font-bold text-danger">
                          DESHABILITADO
                        </span>
                      }

                      <button
                        type="button"
                        class="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
                        (click)="onToggleStatus(op)"
                      >
                        {{ op.status === 'active' ? 'Deshabilitar' : 'Habilitar' }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <section class="rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Nuevo Operador</h2>
            <form (submit)="onCreate($event)">
              <label class="block text-sm text-text-muted mb-1">Nombre completo</label>
              <input
                class="w-full mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                [value]="form.fullName"
                (input)="form.fullName = $any($event.target).value"
              />

              <label class="block text-sm text-text-muted mb-1">Correo</label>
              <input
                type="email"
                class="w-full mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                [value]="form.email"
                (input)="form.email = $any($event.target).value"
              />

              <label class="block text-sm text-text-muted mb-1">Contraseña temporal</label>
              <input
                type="password"
                class="w-full mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                [value]="form.password"
                (input)="form.password = $any($event.target).value"
              />

              <label class="block text-sm text-text-muted mb-1">Rol</label>
              <select
                class="w-full mb-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text capitalize"
                [value]="form.role"
                (change)="form.role = $any($event.target).value"
              >
                @for (role of roleOptions; track role) {
                  <option [value]="role">{{ role }}</option>
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
    this.isSubmitting.set(true);

    this.http.post<Operator>(`${API_BASE_URL}/auth/operators`, this.form).subscribe({
      next: (operator) => {
        this.operators.update((prev) => [...prev, operator]);
        this.form = { fullName: '', email: '', password: '', role: 'guardia', siteId: 'site-default' };
        this.isSubmitting.set(false);
        this.toastService.success(`Operador "${operator.fullName}" creado.`);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message ?? 'No se pudo crear el operador.');
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

  private replaceOperator(updated: Operator): void {
    this.operators.update((prev) => prev.map((op) => (op.id === updated.id ? updated : op)));
  }
}
