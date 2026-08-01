import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PassMode } from '../../../../core/models/user-pass.models';
import { HapticsService } from '../../../../core/services/haptics.service';

@Component({
  selector: 'app-duress-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="duress-wrapper">
      <button
        class="duress-card-btn"
        [class.active]="passMode === 'duress'"
        (click)="onToggleClick()"
        id="duress-panic-btn"
      >
        <div class="duress-content">
          <div class="duress-icon-ring" [class.alert-ring]="passMode === 'duress'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              @if (passMode === 'normal') {
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              } @else {
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              }
            </svg>
          </div>
          <div class="duress-text">
            <span class="duress-title">
              {{ passMode === 'normal' ? 'Activar Coacción Silenciosa' : 'Desactivar Modo Coacción' }}
            </span>
            <span class="duress-subtitle">
              {{ passMode === 'normal' ? 'Alerta sigilosa a seguridad al escanear' : 'Retornar a firma normal de pase' }}
            </span>
          </div>
        </div>
      </button>
    </div>
  `,
  styles: [`
    .duress-wrapper {
      width: 100%;
      max-width: 360px;
      margin: 0 auto;
    }

    .duress-card-btn {
      width: 100%;
      background: var(--umbral-surface, #171a21);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: var(--umbral-radius-lg, 16px);
      padding: 0.85rem 1rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .duress-card-btn:hover {
      border-color: var(--umbral-border-strong, #3a4150);
      background: var(--umbral-surface-hover, #262b36);
    }

    .duress-card-btn.active {
      background: var(--umbral-danger-bg, #3a1618);
      border-color: rgba(229, 72, 77, 0.5);
      box-shadow: 0 0 16px rgba(229, 72, 77, 0.3);
    }

    .duress-content {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .duress-icon-ring {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(229, 72, 77, 0.12);
      border: 1px solid rgba(229, 72, 77, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--umbral-danger, #e5484d);
      flex-shrink: 0;
    }

    .duress-icon-ring svg {
      width: 20px;
      height: 20px;
    }

    .duress-icon-ring.alert-ring {
      background: var(--umbral-success-bg, #123128);
      border-color: rgba(52, 211, 153, 0.3);
      color: var(--umbral-success, #34d399);
    }

    .duress-text {
      display: flex;
      flex-direction: column;
    }

    .duress-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--umbral-text, #e6e8ec);
    }

    .duress-subtitle {
      font-size: 0.75rem;
      color: var(--umbral-text-muted, #9aa1ad);
    }
  `],
})
export class DuressToggleComponent {
  @Input() passMode: PassMode = 'normal';
  @Output() toggleRequested = new EventEmitter<void>();

  private readonly haptics = inject(HapticsService);

  onToggleClick(): void {
    if (this.passMode === 'normal') {
      this.haptics.duressAlert();
    } else {
      this.haptics.lightImpact();
    }
    this.toggleRequested.emit();
  }
}
