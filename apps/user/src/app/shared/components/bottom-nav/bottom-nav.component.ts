import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppTab } from '../../../core/models/user-pass.models';
import { HapticsService } from '../../../core/services/haptics.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="bottom-nav" aria-label="Navegación principal">
      <button
        class="nav-tab"
        [class.active]="activeTab === 'pass'"
        (click)="selectTab('pass')"
        id="tab-pass"
      >
        <div class="icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="16" rx="3"></rect>
            <circle cx="9" cy="10" r="2"></circle>
            <path d="M15 8h2M15 12h2M7 16h10"></path>
          </svg>
        </div>
        <span class="tab-label">Mi Pase</span>
      </button>

      <button
        class="nav-tab"
        [class.active]="activeTab === 'history'"
        (click)="selectTab('history')"
        id="tab-history"
      >
        <div class="icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <span class="tab-label">Historial</span>
      </button>

      <button
        class="nav-tab"
        [class.active]="activeTab === 'visitors'"
        (click)="selectTab('visitors')"
        id="tab-visitors"
      >
        <div class="icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="16" y1="11" x2="22" y2="11"></line>
          </svg>
        </div>
        <span class="tab-label">Visitas</span>
      </button>
    </nav>
  `,
  styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: rgba(23, 26, 33, 0.92);
      backdrop-filter: blur(20px);
      border-top: 1px solid var(--umbral-border, #2a2f3a);
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 90;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
    }

    .nav-tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      height: 100%;
      background: transparent;
      border: none;
      color: var(--umbral-text-muted, #9aa1ad);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .icon-wrapper {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }

    .icon-wrapper svg {
      width: 22px;
      height: 22px;
    }

    .tab-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .nav-tab.active {
      color: var(--umbral-accent, #d9a441);
    }

    .nav-tab.active .icon-wrapper {
      transform: translateY(-2px) scale(1.1);
    }

    .nav-tab.active::after {
      content: '';
      position: absolute;
      top: 0;
      width: 32px;
      height: 3px;
      background: var(--umbral-accent, #d9a441);
      border-radius: 0 0 4px 4px;
      box-shadow: 0 2px 8px rgba(217, 164, 65, 0.5);
    }

    .nav-tab:active {
      transform: scale(0.94);
    }
  `],
})
export class BottomNavComponent {
  @Input() activeTab: AppTab = 'pass';
  @Output() tabSelected = new EventEmitter<AppTab>();

  private readonly haptics = inject(HapticsService);

  selectTab(tab: AppTab): void {
    this.haptics.lightImpact();
    this.tabSelected.emit(tab);
  }
}
