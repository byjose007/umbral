import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { API_BASE_URL } from '../api-base-url';
import { ToastService } from '../shared/ui/toast.service';
import { PageHeaderComponent } from '../shared/ui/page-header.component';
import { StatusBadgeComponent } from '../shared/ui/status-badge.component';
import { ModalComponent } from '../shared/ui/modal.component';
import { PaginationComponent } from '../shared/ui/pagination.component';

interface PersonDto {
  id: string;
  firstName: string;
  lastName: string;
}

interface PersonsPageDto {
  items: PersonDto[];
  total: number;
  page: number;
  pageSize: number;
}

interface CredentialDto {
  id: string;
  personId: string;
  credentialType: string;
  credentialHash: string;
  status: 'active' | 'blocked' | 'expired' | 'revoked';
  blockReason?: string | null;
}

export interface CredentialView {
  id: string;
  personName: string;
  credentialType: string;
  credentialHash: string;
  status: 'active' | 'blocked' | 'expired' | 'revoked';
  blockReason?: string | null;
}

const PAGE_SIZE = 10;

@Component({
  selector: 'app-credentials-console',
  standalone: true,
  imports: [PageHeaderComponent, StatusBadgeComponent, ModalComponent, PaginationComponent],
  template: `
    <div class="p-6">
      <app-page-header
        title="Emisión y Ciclo de Vida de Credenciales"
        subtitle="Cada credencial se almacena como hash SHA-256 irreversible; el número en claro nunca se guarda."
      >
        <app-status-badge status tone="info">● Almacenamiento en hash irreversible</app-status-badge>
      </app-page-header>

      @if (loadError()) {
        <p class="text-sm text-danger">{{ loadError() }}</p>
      } @else {
        <main class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <section class="min-w-0 rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Credenciales Emitidas</h2>

            @if (isLoading()) {
              <p class="text-sm text-text-muted">Cargando…</p>
            } @else if (credentials().length === 0) {
              <p class="text-sm text-text-muted">Las personas de esta página no tienen credenciales emitidas.</p>
            } @else {
              <div class="u-table-wrap">
                <table class="u-table">
                  <thead>
                    <tr>
                      <th>Persona</th>
                      <th>Tipo</th>
                      <th>Hash</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cred of credentials(); track cred.id) {
                      <tr>
                        <td class="font-medium text-text">{{ cred.personName }}</td>
                        <td>{{ cred.credentialType }}</td>
                        <td>
                          <code class="font-mono text-xs text-text-muted">{{ cred.credentialHash.substring(0, 16) }}…</code>
                        </td>
                        <td>
                          @if (cred.status === 'active') {
                            <app-status-badge tone="success">ACTIVA</app-status-badge>
                          } @else {
                            <app-status-badge tone="danger" [attr.title]="cred.blockReason">
                              {{ cred.status === 'blocked' ? 'BLOQUEADA' : cred.status.toUpperCase() }}
                            </app-status-badge>
                          }
                        </td>
                        <td>
                          @if (cred.status === 'active') {
                            <button
                              type="button"
                              class="rounded-md border border-danger px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-bg"
                              (click)="openBlockModal(cred)"
                            >
                              Bloquear
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <app-pagination [page]="page()" [totalPages]="totalPages()" [total]="total()" (pageChange)="loadPage($event)" />

            <app-modal
              [open]="!!blockModalData()"
              title="Bloquear credencial"
              (closed)="closeBlockModal()"
            >
              <p class="text-sm text-text-muted mb-3">
                Vas a bloquear la credencial de <strong>{{ blockModalData()?.personName }}</strong>. Indica el motivo para el registro de auditoría.
              </p>
              <textarea
                class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                rows="3"
                placeholder="Ej: Tarjeta extraviada en recepción"
                [value]="blockReason()"
                (input)="blockReason.set($any($event.target).value)"
              ></textarea>
              @if (blockError()) {
                <p class="mt-2 text-sm text-danger">{{ blockError() }}</p>
              }
              <div class="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  class="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
                  (click)="closeBlockModal()"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  [disabled]="isBlocking()"
                  (click)="confirmBlock()"
                >
                  {{ isBlocking() ? 'Bloqueando…' : 'Bloquear credencial' }}
                </button>
              </div>
            </app-modal>
          </section>

          <section class="rounded-lg border border-border bg-surface p-5">
            <h2 class="mb-3 text-base font-semibold text-text">Mecanismos de Seguridad Integrados</h2>
            <div class="flex flex-col gap-4">
              <div class="rounded-md border border-border bg-bg p-4">
                <h3 class="mb-1 text-sm font-semibold text-text">QR dinámico firmado (ES256)</h3>
                <p class="text-sm text-text-muted leading-relaxed">
                  Los códigos QR rotan periódicamente con un nonce único. La PWA del guardia verifica la firma digital localmente sin requerir conexión al servidor.
                </p>
              </div>
              <div class="rounded-md border border-border bg-bg p-4">
                <h3 class="mb-1 text-sm font-semibold text-text">Código de coacción (duress PIN)</h3>
                <p class="text-sm text-text-muted leading-relaxed">
                  En situaciones de coacción, el usuario introduce su PIN de coacción. El sistema concede el acceso para proteger su vida pero genera de inmediato una alerta crítica silenciosa al centro de monitoreo.
                </p>
              </div>
              <div class="rounded-md border border-border bg-bg p-4">
                <h3 class="mb-1 text-sm font-semibold text-text">Prohibición de tecnologías clonables</h3>
                <p class="text-sm text-text-muted leading-relaxed">
                  Se prohíben 125 kHz y MIFARE Classic. Se adopta DESFire EV2/EV3 y mTLS como estándar.
                </p>
              </div>
            </div>
          </section>
        </main>
      }
    </div>
  `,
})
export class CredentialsConsoleComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  protected readonly credentials = signal<CredentialView[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly blockModalData = signal<{ credentialId: string; personName: string } | null>(null);
  protected readonly blockReason = signal('');
  protected readonly blockError = signal<string | null>(null);
  protected readonly isBlocking = signal(false);

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
            return of({ pageResult, credentialsByPerson: [] as CredentialDto[][] });
          }
          return forkJoin(
            pageResult.items.map((person) =>
              this.http.get<CredentialDto[]>(`${API_BASE_URL}/credentials/person/${person.id}`),
            ),
          ).pipe(map((credentialsByPerson) => ({ pageResult, credentialsByPerson })));
        }),
      )
      .subscribe({
        next: ({ pageResult, credentialsByPerson }) => {
          const personNameById = new Map(
            pageResult.items.map((p) => [p.id, `${p.firstName} ${p.lastName}`]),
          );

          const views: CredentialView[] = [];
          credentialsByPerson.forEach((creds) => {
            creds.forEach((cred) => {
              views.push({
                id: cred.id,
                personName: personNameById.get(cred.personId) ?? 'Persona desconocida',
                credentialType: cred.credentialType,
                credentialHash: cred.credentialHash,
                status: cred.status,
                blockReason: cred.blockReason,
              });
            });
          });

          this.credentials.set(views);
          this.total.set(pageResult.total);
          this.page.set(pageResult.page);
          this.isLoading.set(false);
        },
        error: () => {
          this.loadError.set('No se pudo cargar la lista de credenciales desde el backend.');
          this.isLoading.set(false);
        },
      });
  }

  protected openBlockModal(cred: CredentialView): void {
    this.blockError.set(null);
    this.blockReason.set('');
    this.blockModalData.set({ credentialId: cred.id, personName: cred.personName });
  }

  protected closeBlockModal(): void {
    this.blockModalData.set(null);
  }

  protected confirmBlock(): void {
    const target = this.blockModalData();
    if (!target) {
      return;
    }
    if (!this.blockReason().trim()) {
      this.blockError.set('Indica un motivo para el bloqueo.');
      return;
    }

    this.isBlocking.set(true);
    this.http
      .post(`${API_BASE_URL}/credentials/block`, {
        credentialId: target.credentialId,
        reason: this.blockReason().trim(),
      })
      .subscribe({
        next: () => {
          this.isBlocking.set(false);
          this.blockModalData.set(null);
          this.toastService.success(`Credencial de ${target.personName} bloqueada.`);
          this.loadPage(this.page());
        },
        error: () => {
          this.isBlocking.set(false);
          this.blockError.set('No se pudo bloquear la credencial.');
        },
      });
  }
}
