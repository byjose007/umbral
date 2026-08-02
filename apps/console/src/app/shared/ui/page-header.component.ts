import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 class="text-xl font-semibold text-text">{{ title }}</h1>
        @if (subtitle) {
          <p class="mt-1 text-sm text-text-muted">{{ subtitle }}</p>
        }
      </div>
      <div class="flex items-center gap-3">
        <ng-content select="[status]" />
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle?: string;
}
