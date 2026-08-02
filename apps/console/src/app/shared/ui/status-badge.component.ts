import { Component, Input } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
      [class]="toneClass"
    >
      <ng-content />
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() set tone(value: BadgeTone) {
    this.toneClass = StatusBadgeComponent.TONE_CLASSES[value];
  }

  private static readonly TONE_CLASSES: Record<BadgeTone, string> = {
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    danger: 'bg-danger-bg text-danger',
    info: 'bg-surface-2 text-teal',
    neutral: 'bg-surface-2 text-text-muted',
  };

  protected toneClass = StatusBadgeComponent.TONE_CLASSES.neutral;
}
