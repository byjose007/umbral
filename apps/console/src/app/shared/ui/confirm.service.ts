import { Injectable, signal } from '@angular/core';

interface ConfirmRequest {
  message: string;
  title: string;
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _request = signal<ConfirmRequest | null>(null);
  readonly request = this._request.asReadonly();

  confirm(message: string, title = 'Confirmar acción'): Promise<boolean> {
    return new Promise((resolve) => {
      this._request.set({ message, title, resolve });
    });
  }

  respond(confirmed: boolean): void {
    this._request()?.resolve(confirmed);
    this._request.set(null);
  }
}
