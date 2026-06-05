import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected email = '';
  protected password = '';
  protected isLoading = false;
  protected errorMsg = '';

  protected submit(): void {
    if (!this.email || !this.password) return;

    this.isLoading = true;
    this.errorMsg = '';
    this.cdr.markForCheck();

    this.authService.login({ email: this.email, password: this.password }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(
          returnUrl && returnUrl !== '/login' ? returnUrl : '/commercial/sales'
        );
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401 || err.status === 403) {
          this.errorMsg = 'Correo o contrasena incorrectos.';
        } else if (err.status === 0) {
          this.errorMsg = 'No se pudo conectar con el servidor. Verifica que el backend este corriendo.';
        } else if (err.message === 'La respuesta de autenticación no contiene token.') {
          this.errorMsg = 'La respuesta del servidor no incluyo un token valido.';
        } else {
          this.errorMsg = 'Ocurrio un error al iniciar sesion. Intenta de nuevo.';
        }
        this.cdr.markForCheck();
      }
    });
  }
}
