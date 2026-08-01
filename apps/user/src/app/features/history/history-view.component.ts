import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessHistoryEntry } from '../../core/models/user-pass.models';

@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="history-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Historial de Accesos</h2>
          <p class="section-subtitle">Eventos recientes en molinetes y torniquetes</p>
        </div>
        <span class="entry-badge">{{ history.length }} eventos</span>
      </div>

      @if (history.length === 0) {
        <div class="empty-state">
          <div class="empty-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <p class="empty-title">Sin accesos registrados</p>
          <p class="empty-sub">Tus escaneos de pase aparecerán aquí en tiempo real.</p>
        </div>
      } @else {
        <div class="history-timeline">
          @for (entry of history; track entry.id) {
            <div
              class="history-card"
              [class.denied-card]="!entry.granted"
              [class.duress-card]="entry.isDuress"
            >
              <div class="status-icon-wrapper" [class.denied]="!entry.granted" [class.duress]="entry.isDuress">
                @if (entry.isDuress) {
                  <span>🆘</span>
                } @else if (entry.eventType === 'ENTRY') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                } @else if (entry.eventType === 'EXIT') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                } @else {
                  <span>❌</span>
                }
              </div>

              <div class="entry-meta">
                <span class="door-title">{{ entry.doorLabel }}</span>
                <span class="event-time">{{ entry.occurredAt | date:'dd/MM/yyyy · HH:mm:ss' }}</span>
              </div>

              <span
                class="status-pill"
                [class.granted]="entry.granted && !entry.isDuress"
                [class.denied]="!entry.granted"
                [class.duress]="entry.isDuress"
              >
                @if (entry.isDuress) {
                  Coacción
                } @else {
                  {{ entry.granted ? 'Concedido' : 'Denegado' }}
                }
              </span>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .history-section {
      padding: 1.25rem 1rem 5rem;
      max-width: 480px;
      margin: 0 auto;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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

    .entry-badge {
      font-size: 0.7rem;
      font-weight: 700;
      background: var(--umbral-surface-2, #1f232c);
      border: 1px solid var(--umbral-border, #2a2f3a);
      color: var(--umbral-text-muted, #9aa1ad);
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
    }

    .empty-state {
      text-align: center;
      padding: 3.5rem 1.5rem;
      background: var(--umbral-surface, #171a21);
      border: 1px border-dashed var(--umbral-border, #2a2f3a);
      border-radius: var(--umbral-radius-lg, 16px);
    }

    .empty-icon-box {
      width: 48px;
      height: 48px;
      margin: 0 auto 0.75rem;
      background: var(--umbral-surface-2, #1f232c);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--umbral-text-muted, #9aa1ad);
    }

    .empty-icon-box svg {
      width: 24px;
      height: 24px;
    }

    .empty-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--umbral-text, #e6e8ec);
      margin: 0 0 0.25rem;
    }

    .empty-sub {
      font-size: 0.75rem;
      color: var(--umbral-text-muted, #9aa1ad);
      margin: 0;
    }

    .history-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .history-card {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      background: var(--umbral-surface, #171a21);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: var(--umbral-radius-md, 10px);
      padding: 0.85rem 1rem;
      transition: all 0.2s ease;
    }

    .history-card.denied-card {
      border-color: rgba(229, 72, 77, 0.3);
      background: rgba(229, 72, 77, 0.04);
    }

    .history-card.duress-card {
      border-color: rgba(229, 72, 77, 0.5);
      background: var(--umbral-danger-bg, #3a1618);
    }

    .status-icon-wrapper {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--umbral-surface-2, #1f232c);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--umbral-success, #34d399);
      flex-shrink: 0;
    }

    .status-icon-wrapper svg {
      width: 18px;
      height: 18px;
    }

    .status-icon-wrapper.denied {
      color: var(--umbral-danger, #e5484d);
    }

    .entry-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .door-title {
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--umbral-text, #e6e8ec);
    }

    .event-time {
      font-size: 0.68rem;
      color: var(--umbral-text-muted, #9aa1ad);
    }

    .status-pill {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
    }

    .status-pill.granted {
      background: var(--umbral-success-bg, #123128);
      color: var(--umbral-success, #34d399);
    }

    .status-pill.denied, .status-pill.duress {
      background: var(--umbral-danger-bg, #3a1618);
      color: var(--umbral-danger, #e5484d);
    }
  `],
})
export class HistoryViewComponent {
  @Input() history: AccessHistoryEntry[] = [];
}
