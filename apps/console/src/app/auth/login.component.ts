import { Component, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-bg px-4">
      <div class="w-full max-w-sm">
        <div class="mb-8 text-center">
          <div class="text-2xl font-semibold tracking-tight text-text">UMBRAL</div>
          <div class="mt-1 text-sm text-text-muted">Consola de control de acceso</div>
        </div>

        <form
          class="rounded-lg border border-border bg-surface p-6 shadow-md"
          (submit)="onSubmit($event)"
        >
          <label class="block text-sm text-text-muted mb-1" for="email">Correo</label>
          <input
            id="email"
            type="email"
            autocomplete="username"
            class="w-full mb-4 rounded-md border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-text-faint focus:outline-none focus:border-accent"
            placeholder="operador@umbral.local"
            [value]="email()"
            (input)="email.set($any($event.target).value)"
          />

          <label class="block text-sm text-text-muted mb-1" for="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            class="w-full mb-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-text-faint focus:outline-none focus:border-accent"
            placeholder="••••••••"
            [value]="password()"
            (input)="password.set($any($event.target).value)"
          />

          @if (errorMessage()) {
            <p class="mb-3 text-sm text-danger">{{ errorMessage() }}</p>
          }

          <button
            type="submit"
            class="mt-3 w-full rounded-md bg-accent py-2 font-medium text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
            [disabled]="isSubmitting()"
          >
            {{ isSubmitting() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      await this.authService.login(this.email(), this.password());
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      await this.router.navigateByUrl(returnUrl);
    } catch {
      this.errorMessage.set('Credenciales inválidas.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
