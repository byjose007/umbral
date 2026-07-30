import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  text: string;
}

const DEFAULT_DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(text: string, kind: ToastKind = 'info', durationMs = DEFAULT_DURATION_MS): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this._toasts.update((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => this.dismiss(id), durationMs);
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  dismiss(id: string): void {
    this._toasts.update((prev) => prev.filter((t) => t.id !== id));
  }
}
