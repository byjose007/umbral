import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto min-w-[240px] max-w-sm rounded-md border px-4 py-3 text-sm shadow-md"
          [class]="kindClasses(toast.kind)"
        >
          {{ toast.text }}
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);

  protected kindClasses(kind: 'success' | 'error' | 'info'): string {
    switch (kind) {
      case 'success':
        return 'border-success bg-success-bg text-success';
      case 'error':
        return 'border-danger bg-danger-bg text-danger';
      default:
        return 'border-border bg-surface text-text';
    }
  }
}
