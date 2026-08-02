import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (open) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        (click)="onBackdropClick($event)"
      >
        <div
          #dialog
          class="w-full rounded-lg border border-border bg-surface p-6 shadow-md"
          [class.max-w-sm]="size === 'sm'"
          [class.max-w-md]="size === 'md'"
          [class.max-w-lg]="size === 'lg'"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title || null"
          tabindex="-1"
        >
          @if (title) {
            <h3 class="mb-4 text-lg font-semibold text-text">{{ title }}</h3>
          }
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class ModalComponent implements AfterViewChecked {
  @Input() open = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('dialog') private dialogEl?: ElementRef<HTMLElement>;
  private focusedOnOpen = false;

  ngAfterViewChecked(): void {
    if (this.open && !this.focusedOnOpen && this.dialogEl) {
      this.dialogEl.nativeElement.focus();
      this.focusedOnOpen = true;
    } else if (!this.open) {
      this.focusedOnOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open) {
      this.closed.emit();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
