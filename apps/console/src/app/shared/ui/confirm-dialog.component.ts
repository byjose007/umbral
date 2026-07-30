import { Component, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (confirmService.request(); as req) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div class="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-md">
          <h3 class="mb-2 text-base font-semibold text-text">{{ req.title }}</h3>
          <p class="mb-5 text-sm text-text-muted">{{ req.message }}</p>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
              (click)="confirmService.respond(false)"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              (click)="confirmService.respond(true)"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirmService = inject(ConfirmService);
}
