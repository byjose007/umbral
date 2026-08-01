import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="app-header">
      <div class="header-left">
        <div class="user-avatar-ring">
          <span class="user-avatar">{{ initials }}</span>
        </div>
        <div class="user-info">
          <span class="user-name">{{ userName }}</span>
          <span class="user-dept">{{ userDepartment }}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="conn-pill" [class.offline]="!isOnline">
          <span class="pulse-dot"></span>
          <span class="conn-label">{{ isOnline ? 'En línea' : 'Sin conexión' }}</span>
        </div>
        <button class="logout-btn" (click)="logoutRequested.emit()" id="logout-btn" aria-label="Cerrar sesión">
          <svg class="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Salir
        </button>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      background: rgba(23, 26, 33, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--umbral-border, #2a2f3a);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar-ring {
      padding: 2px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--umbral-accent, #d9a441), #8b5cf6);
    }

    .user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--umbral-bg, #0f1115);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.82rem;
      color: var(--umbral-text, #e6e8ec);
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 700;
      font-size: 0.88rem;
      color: var(--umbral-text, #e6e8ec);
      letter-spacing: -0.01em;
    }

    .user-dept {
      font-size: 0.7rem;
      color: var(--umbral-text-muted, #9aa1ad);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .conn-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--umbral-success-bg, #123128);
      border: 1px solid rgba(52, 211, 153, 0.3);
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--umbral-success, #34d399);
    }

    .conn-pill.offline {
      background: var(--umbral-danger-bg, #3a1618);
      border-color: rgba(229, 72, 77, 0.3);
      color: var(--umbral-danger, #e5484d);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--umbral-surface-2, #1f232c);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: 8px;
      color: var(--umbral-text-muted, #9aa1ad);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.35rem 0.65rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      color: var(--umbral-text, #e6e8ec);
      border-color: var(--umbral-border-strong, #3a4150);
    }

    .logout-icon {
      width: 14px;
      height: 14px;
    }
  `],
})
export class AppHeaderComponent {
  @Input() userName = '';
  @Input() userDepartment = '';
  @Input() initials = '';
  @Input() isOnline = true;
  @Output() logoutRequested = new EventEmitter<void>();
}
