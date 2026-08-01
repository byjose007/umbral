import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmark, lockClosedOutline, mailOutline, flashOutline } from 'ionicons/icons';
import { AuthService } from './auth.service';

addIcons({
  'shield-checkmark': shieldCheckmark,
  'lock-closed-outline': lockClosedOutline,
  'mail-outline': mailOutline,
  'flash-outline': flashOutline,
});

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonButton, IonIcon],
  template: `
    <ion-content class="login-content">
      <div class="login-wrapper">
        <div class="login-card">
          <!-- Logo y Marca -->
          <div class="brand-header">
            <div class="brand-badge">
              <ion-icon name="shield-checkmark" class="brand-icon"></ion-icon>
            </div>
            <h1 class="brand-title">UMBRAL GUARDIA</h1>
            <p class="brand-subtitle">Control de Acceso & Consola de Garita PWA</p>
          </div>

          <!-- Estado Offline Ready -->
          <div class="offline-ready-banner">
            <ion-icon name="flash-outline"></ion-icon>
            <span>Verificación de Pases ES256 Offline Ready</span>
          </div>

          <!-- Formulario de Autenticación -->
          <form (ngSubmit)="onSubmit()" class="login-form">
            <div class="form-group">
              <label class="form-label">
                <ion-icon name="mail-outline"></ion-icon> Operador / Correo de Guardia
              </label>
              <ion-input
                type="email"
                placeholder="guardia@umbral.local"
                [(ngModel)]="email"
                name="email"
                class="custom-login-input"
              ></ion-input>
            </div>

            <div class="form-group">
              <label class="form-label">
                <ion-icon name="lock-closed-outline"></ion-icon> Contraseña
              </label>
              <ion-input
                type="password"
                placeholder="••••••••"
                [(ngModel)]="password"
                name="password"
                class="custom-login-input"
              ></ion-input>
            </div>

            <div *ngIf="errorMessage()" class="error-box">
              {{ errorMessage() }}
            </div>

            <ion-button expand="block" color="primary" type="submit" [disabled]="isSubmitting()" class="submit-btn">
              {{ isSubmitting() ? 'Iniciando Sesión...' : 'Ingresar a Garita' }}
            </ion-button>
          </form>

          <!-- Pie de página de sesión -->
          <div class="login-footer">
            <span>Garita Principal • Sitio Quito Norte</span>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-content {
      --background: var(--umbral-bg, #0f1115);
    }

    .login-wrapper {
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      background: var(--umbral-surface, #171a21);
      border: 1px solid var(--umbral-border, #2a2f3a);
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    }

    .brand-header {
      text-align: center;
      margin-bottom: 20px;

      .brand-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        background: rgba(217, 164, 65, 0.15);
        border: 1px solid var(--umbral-accent, #d9a441);
        border-radius: 50%;
        margin-bottom: 12px;

        .brand-icon {
          font-size: 2rem;
          color: var(--umbral-accent, #d9a441);
        }
      }

      .brand-title {
        font-size: 1.35rem;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: var(--umbral-text, #e6e8ec);
        margin: 0;
      }

      .brand-subtitle {
        font-size: 0.8rem;
        color: var(--umbral-text-muted, #9aa1ad);
        margin-top: 4px;
      }
    }

    .offline-ready-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: rgba(52, 211, 153, 0.12);
      border: 1px solid var(--umbral-success, #34d399);
      color: var(--umbral-success, #34d399);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .form-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--umbral-text-muted, #9aa1ad);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .custom-login-input {
        --background: var(--umbral-surface-2, #1f232c);
        --color: var(--umbral-text, #e6e8ec);
        --placeholder-color: var(--umbral-text-faint, #6b7280);
        --border-color: var(--umbral-border, #2a2f3a);
        --border-radius: 8px;
        --padding-start: 12px;
        border: 1px solid var(--umbral-border, #2a2f3a);
        border-radius: 8px;
      }
    }

    .error-box {
      background: var(--umbral-danger-bg, #3a1618);
      border: 1px solid var(--umbral-danger, #e5484d);
      color: var(--umbral-danger, #e5484d);
      padding: 10px;
      border-radius: 8px;
      font-size: 0.82rem;
      text-align: center;
    }

    .submit-btn {
      --border-radius: 8px;
      font-weight: 700;
      letter-spacing: 0.3px;
      margin-top: 4px;
    }

    .login-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--umbral-border, #2a2f3a);
      font-size: 0.75rem;
      color: var(--umbral-text-faint, #6b7280);
    }
  `]
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
      this.errorMessage.set('Credenciales inválidas. Verifique correo y contraseña.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
