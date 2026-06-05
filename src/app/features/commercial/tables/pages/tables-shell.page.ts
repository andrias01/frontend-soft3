import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SnackbarComponent } from '../components/snackbar.component';

@Component({
  selector: 'eatup-tables-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SnackbarComponent],
  template: `
    <main class="tables-shell">
      <aside class="module-nav">
        <div class="brand">
          <strong>Mesas</strong>
          <small>Gestión de reservas y sesiones</small>
        </div>

        <nav>
          <a routerLink="./dashboard" routerLinkActive="active">Información</a>
          <a routerLink="./list" routerLinkActive="active">Mesas</a>
          <a routerLink="./sessions" routerLinkActive="active">Sesiones</a>
          <a routerLink="./reservations" routerLinkActive="active">Reservas</a>
        </nav>
      </aside>

      <section class="module-content">
        <router-outlet />
      </section>

      <eatup-snackbar />
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
      }

      .tables-shell {
        background: radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 30%),
                    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        min-height: 100dvh;
      }

      .module-nav {
        background: #ffffff;
        border-right: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 26px 60px rgba(15, 23, 42, 0.06);
        padding: 28px;
      }

      .brand {
        display: grid;
        gap: 4px;
        margin-bottom: 32px;
      }

      .brand strong {
        color: #0f172a;
        font-size: 1.8rem;
        letter-spacing: -0.05em;
      }

      .brand small {
        color: #64748b;
        font-size: 0.95rem;
      }

      nav {
        display: grid;
        gap: 12px;
      }

      a {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: 18px;
        color: #0f172a;
        font-weight: 700;
        padding: 14px 18px;
        text-decoration: none;
        background: #f8fafc;
        border: 1px solid transparent;
        transition:
          background 180ms ease,
          border-color 180ms ease,
          transform 180ms ease;
      }

      a::before {
        content: '';
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #cbd5e1;
        flex-shrink: 0;
      }

      a:hover {
        background: rgba(255, 107, 53, 0.12);
        transform: translateX(2px);
      }

      a.active {
        background: linear-gradient(90deg, #0f172a, #ff6b35);
        color: #ffffff;
        border-color: transparent;
      }

      a.active::before {
        background: rgba(255, 255, 255, 0.8);
      }

      .module-content {
        min-width: 0;
        padding: 28px;
      }

      @media (max-width: 860px) {
        .tables-shell {
          grid-template-columns: 1fr;
        }

        .module-nav {
          border-bottom: 1px solid rgba(27, 27, 27, 0.08);
          border-right: 0;
        }

        nav {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          overflow-x: auto;
        }
      }
    `,
  ],
})
export class TablesShellPage {}
