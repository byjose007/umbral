import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VisitorPassRecord, VisitorStatus } from '../../core/models/user-pass.models';
import { HapticsService } from '../../core/services/haptics.service';

@Component({
  selector: 'app-visitors-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="visitors-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Pases de Visitantes</h2>
          <p class="section-subtitle">Invita y comparte acceso temporal seguro</p>
        </div>
        <button class="new-pass-btn" (click)="openNewPassModal()" id="new-visitor-pass-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo Pase
        </button>
      </div>

      <!-- Status Filter Tabs -->
      <div class="filter-pills">
        @for (s of statusFilters; track s.value) {
          <button
            class="pill-btn"
            [class.active]="selectedFilter === s.value"
            (click)="selectFilter(s.value)"
            [id]="'filter-' + s.value"
          >
            {{ s.label }}
          </button>
        }
      </div>

      <!-- Passes List -->
      @if (passes.length === 0) {
        <div class="empty-state">
          <div class="empty-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <p class="empty-title">Sin pases {{ selectedFilter !== 'all' ? selectedFilter + 's' : '' }}</p>
          <p class="empty-sub">Crea un pase temporal para tus visitantes o proveedores.</p>
        </div>
      } @else {
        <div class="pass-cards-grid">
          @for (pass of passes; track pass.id) {
            <div class="visitor-card" [class.expired]="pass.status === 'expired'">
              <div class="visitor-card-head">
                <span class="visitor-name">{{ pass.visitorName }}</span>
                <span class="status-badge" [class]="pass.status">
                  {{ getStatusLabel(pass.status) }}
                </span>
              </div>

              <div class="visitor-card-body">
                <div class="info-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{{ pass.validFrom | date:'dd/MM HH:mm' }} → {{ pass.validTo | date:'dd/MM HH:mm' }}</span>
                </div>
                <div class="info-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  <span>{{ pass.usedCount }} de {{ pass.maxUses }} usos registrados</span>
                </div>
              </div>

              @if (pass.status === 'active') {
                <div class="visitor-card-actions">
                  <button class="share-btn whatsapp" (click)="shareWhatsApp.emit(pass)" [id]="'wa-' + pass.id">
                    💬 WhatsApp
                  </button>
                  <button class="share-btn email" (click)="shareEmail.emit(pass)" [id]="'email-' + pass.id">
                    ✉️ Email
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Bottom Sheet Modal for Creating Visitor Pass -->
      @if (showForm) {
        <div class="modal-backdrop" (click)="closeFormModal()">
          <div class="bottom-sheet" (click)="$event.stopPropagation()">
            <div class="sheet-handle"></div>
            <h3 class="sheet-title">Generar Nuevo Pase de Visita</h3>

            <div class="form-group">
              <label for="v-name">Nombre del visitante *</label>
              <input
                id="v-name"
                [(ngModel)]="newPass.visitorName"
                placeholder="Ej. Carlos Mendoza"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="v-email">Correo electrónico (opcional)</label>
              <input
                id="v-email"
                type="email"
                [(ngModel)]="newPass.visitorEmail"
                placeholder="visitante@ejemplo.com"
                class="form-input"
              />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="v-from">Válido Desde</label>
                <input
                  id="v-from"
                  type="datetime-local"
                  [(ngModel)]="newPass.validFrom"
                  class="form-input"
                />
              </div>
              <div class="form-group flex-1">
                <label for="v-to">Válido Hasta</label>
                <input
                  id="v-to"
                  type="datetime-local"
                  [(ngModel)]="newPass.validTo"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="v-uses">Límite de Usos Permitidos</label>
              <input
                id="v-uses"
                type="number"
                [(ngModel)]="newPass.maxUses"
                min="1"
                max="10"
                class="form-input"
              />
            </div>

            <div class="sheet-actions">
              <button class="btn-cancel" (click)="closeFormModal()" id="cancel-pass-btn">Cancelar</button>
              <button class="btn-submit" (click)="onIssueClick()" id="issue-pass-btn">Emitir Pase QR</button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .visitors-section {
      padding: 1.25rem 1rem 5rem;
      max-width: 480px;
      margin: 0 auto;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--umbral-text, #e6e8ec);
      margin: 0;
    }

    .section-subtitle {
      font-size: 0.72rem;
      color: var(--umbral-text-muted, #9aa1ad);
      margin-top: 0.2rem;
    }

    .new-pass-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--umbral-accent, #d9a441);
      color: var(--umbral-accent-text, #1a1406);
      border: none;
      border-radius: var(--umbral-radius-md, 10px);
      padding: 0.5rem 0.85rem;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(217, 164, 65, 0.3);
      transition: all 0.2s ease;
    }

    .new-pass-btn svg {
      width: 16px;
      height: 16px;
    }

    .filter-pills {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }

    .pill-btn {
      background: var(--umbral-surface, #171a21);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: 999px;
      color: var(--umbral-text-muted, #9aa1ad);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.35rem 0.85rem;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .pill-btn.active {
      background: rgba(217, 164, 65, 0.15);
      border-color: rgba(217, 164, 65, 0.4);
      color: var(--umbral-accent, #d9a441);
    }

    .pass-cards-grid {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .visitor-card {
      background: var(--umbral-surface, #171a21);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: var(--umbral-radius-md, 10px);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .visitor-card.expired {
      opacity: 0.5;
    }

    .visitor-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .visitor-name {
      font-size: 0.9rem;
      font-weight: 800;
      color: var(--umbral-text, #e6e8ec);
    }

    .status-badge {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      text-transform: uppercase;
    }

    .status-badge.active {
      background: var(--umbral-success-bg, #123128);
      color: var(--umbral-success, #34d399);
    }

    .status-badge.used {
      background: var(--umbral-warning-bg, #3a2a0f);
      color: var(--umbral-warning, #f5a623);
    }

    .status-badge.expired {
      background: var(--umbral-surface-2, #1f232c);
      color: var(--umbral-text-faint, #6b7280);
    }

    .visitor-card-body {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.73rem;
      color: var(--umbral-text-muted, #9aa1ad);
    }

    .info-row svg {
      width: 14px;
      height: 14px;
      color: var(--umbral-accent, #d9a441);
    }

    .visitor-card-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .share-btn {
      flex: 1;
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: 8px;
      padding: 0.45rem;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .share-btn.whatsapp {
      background: rgba(37, 211, 102, 0.12);
      border-color: rgba(37, 211, 102, 0.3);
      color: #4ade80;
    }

    .share-btn.email {
      background: rgba(217, 164, 65, 0.12);
      border-color: rgba(217, 164, 65, 0.3);
      color: var(--umbral-accent, #d9a441);
    }

    /* Modal Bottom Sheet */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 100;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .bottom-sheet {
      width: 100%;
      max-width: 480px;
      background: var(--umbral-surface, #171a21);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: 24px 24px 0 0;
      padding: 1.25rem 1.5rem 2rem;
      box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.6);
      animation: sheet-up 0.25s cubic-bezier(0, 0, 0.2, 1);
    }

    @keyframes sheet-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .sheet-handle {
      width: 40px;
      height: 4px;
      background: var(--umbral-border-strong, #3a4150);
      border-radius: 2px;
      margin: 0 auto 1.25rem;
    }

    .sheet-title {
      font-size: 1rem;
      font-weight: 800;
      color: var(--umbral-text, #e6e8ec);
      margin: 0 0 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1rem;
    }

    .form-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--umbral-text-muted, #9aa1ad);
    }

    .form-input {
      background: var(--umbral-surface-2, #1f232c);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: 10px;
      padding: 0.65rem 0.85rem;
      color: var(--umbral-text, #e6e8ec);
      font-size: 0.85rem;
      outline: none;
    }

    .form-input:focus {
      border-color: var(--umbral-accent, #d9a441);
    }

    .form-row {
      display: flex;
      gap: 0.75rem;
    }

    .flex-1 { flex: 1; }

    .sheet-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .btn-cancel {
      flex: 1;
      background: var(--umbral-surface-2, #1f232c);
      border: 1px solid var(--umbral-border, #2a2f3a);
      color: var(--umbral-text-muted, #9aa1ad);
      border-radius: 10px;
      padding: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-submit {
      flex: 2;
      background: var(--umbral-accent, #d9a441);
      color: var(--umbral-accent-text, #1a1406);
      border: none;
      border-radius: 10px;
      padding: 0.75rem;
      font-weight: 800;
      cursor: pointer;
    }
  `],
})
export class VisitorsViewComponent {
  @Input() passes: VisitorPassRecord[] = [];
  @Input() selectedFilter = 'all';
  @Input() showForm = false;
  @Input() newPass = { visitorName: '', visitorEmail: '', validFrom: '', validTo: '', maxUses: 1 };

  @Output() filterChanged = new EventEmitter<string>();
  @Output() formToggled = new EventEmitter<boolean>();
  @Output() issuePassRequested = new EventEmitter<void>();
  @Output() shareWhatsApp = new EventEmitter<VisitorPassRecord>();
  @Output() shareEmail = new EventEmitter<VisitorPassRecord>();

  private readonly haptics = inject(HapticsService);

  readonly statusFilters = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'used', label: 'Usados' },
    { value: 'expired', label: 'Vencidos' },
  ];

  selectFilter(val: string): void {
    this.haptics.lightImpact();
    this.filterChanged.emit(val);
  }

  openNewPassModal(): void {
    this.haptics.lightImpact();
    this.formToggled.emit(true);
  }

  closeFormModal(): void {
    this.formToggled.emit(false);
  }

  onIssueClick(): void {
    this.haptics.mediumImpact();
    this.issuePassRequested.emit();
  }

  getStatusLabel(status: VisitorStatus): string {
    return { active: 'Activo', used: 'Agotado', expired: 'Vencido' }[status];
  }
}
