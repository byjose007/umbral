import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonInput, IonButton } from '@ionic/angular/standalone';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IonContent, IonInput, IonButton],
  template: `
    <ion-content class="ion-padding">
      <div class="flex min-h-full items-center justify-center">
        <div class="w-full max-w-sm">
          <div class="mb-8 text-center">
            <div class="text-2xl font-semibold tracking-tight text-text">UMBRAL</div>
            <div class="mt-1 text-sm text-text-muted">PWA de Garita</div>
          </div>

          <div class="rounded-lg border border-border bg-surface p-6">
            <ion-input
              label="Correo"
              labelPlacement="stacked"
              type="email"
              placeholder="guardia@umbral.local"
              [(ngModel)]="email"
              class="mb-3"
            />
            <ion-input
              label="Contraseña"
              labelPlacement="stacked"
              type="password"
              placeholder="••••••••"
              [(ngModel)]="password"
              class="mb-3"
            />

            @if (errorMessage()) {
              <p class="mb-2 text-sm text-danger">{{ errorMessage() }}</p>
            }

            <ion-button expand="block" [disabled]="isSubmitting()" (click)="onSubmit()">
              {{ isSubmitting() ? 'Ingresando…' : 'Ingresar' }}
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
})
export class LoginPage {
  protected email = '';
  protected password = '';
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  async onSubmit(): Promise<void> {
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      await this.authService.login(this.email, this.password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home';
      await this.router.navigateByUrl(returnUrl);
    } catch {
      this.errorMessage.set('Credenciales inválidas.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
