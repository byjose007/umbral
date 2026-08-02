import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages > 1) {
      <div class="mt-4 flex items-center justify-between">
        <button
          type="button"
          class="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40"
          [disabled]="page <= 1"
          (click)="pageChange.emit(page - 1)"
        >
          ← Anterior
        </button>
        <span class="text-sm text-text-muted">
          Página {{ page }} de {{ totalPages }}
          @if (total !== undefined) {
            · {{ total }} en total
          }
        </span>
        <button
          type="button"
          class="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40"
          [disabled]="page >= totalPages"
          (click)="pageChange.emit(page + 1)"
        >
          Siguiente →
        </button>
      </div>
    }
  `,
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() total?: number;
  @Output() pageChange = new EventEmitter<number>();
}
