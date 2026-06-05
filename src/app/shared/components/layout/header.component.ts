import { Component, inject, output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="top-bar">
      <div class="header-left">
        <!-- Hamburger Menu for mobile & toggle sidebar -->
        <button class="btn-hamburger" (click)="toggleSidebar.emit()" title="Menú">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <!-- Dynamic Breadcrumb -->
        <div class="breadcrumb">
          <span class="breadcrumb-prefix">EatUp</span>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">{{ currentPath() }}</span>
        </div>
      </div>

      <!-- Mock Search Bar -->
      <div class="search-container">
        <div class="search-wrapper">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.603 10.603z" />
          </svg>
          <input type="text" class="search-input" placeholder="Buscar funciones, ventas, productos..." aria-label="Buscar" />
          <span class="search-shortcut">⌘K</span>
        </div>
      </div>

      <!-- User Profile & Actions -->
      <div class="user-profile">
        <button class="btn-user" type="button" (click)="openProfile.emit()" title="Ver Perfil">
          <span class="avatar-icon">👤</span>
          <span class="user-name">Mi perfil</span>
        </button>
        
        <button class="btn-logout" (click)="confirmLogout.emit()" title="Cerrar Sesión">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 logout-icon-svg">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span class="logout-text">Cerrar sesión</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .top-bar {
      height: 64px;
      background-color: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      flex-shrink: 0;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .btn-hamburger {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-hamburger:hover {
      background-color: #f1f5f9;
      color: #1e293b;
    }

    .btn-hamburger svg {
      width: 20px;
      height: 20px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #64748b;
    }

    .breadcrumb-prefix {
      color: #94a3b8;
    }

    .breadcrumb-separator {
      color: #cbd5e1;
    }

    .breadcrumb-current {
      color: #1e293b;
      font-weight: 600;
    }

    /* Mock Search Bar Styling */
    .search-container {
      flex: 1;
      max-width: 400px;
      margin: 0 1.5rem;
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      width: 18px;
      height: 18px;
      color: #94a3b8;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      height: 38px;
      padding: 0.5rem 2.5rem 0.5rem 2.25rem;
      font-size: 0.875rem;
      background-color: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 0.5rem;
      color: #1e293b;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      background-color: #ffffff;
      border-color: #ff6b35;
      box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.15);
    }

    .search-shortcut {
      position: absolute;
      right: 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      background-color: #e2e8f0;
      padding: 0.15rem 0.35rem;
      border-radius: 0.25rem;
      pointer-events: none;
    }

    /* User Profile Styles */
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-user {
      border: 1.5px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      border-radius: 9999px;
      padding: 0.4rem 0.85rem;
      font-size: 0.8125rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-user:hover {
      background-color: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .avatar-icon {
      font-size: 0.875rem;
    }

    .btn-logout {
      background: none;
      border: 1.5px solid #ff6b35;
      color: #ff6b35;
      border-radius: 0.5rem;
      padding: 0.4rem 0.85rem;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s;
    }

    .btn-logout:hover {
      background-color: #ff6b35;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.15);
    }

    .logout-icon-svg {
      width: 14px;
      height: 14px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .search-container {
        display: none; /* Hide search bar on tablets & mobile to save space */
      }
      .user-name, .logout-text {
        display: none; /* Icon/avatar only on small screens */
      }
      .btn-user, .btn-logout {
        padding: 0.5rem;
        border-radius: 50%;
        width: 34px;
        height: 34px;
        justify-content: center;
      }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private routerSubscription?: Subscription;

  protected readonly currentPath = signal<string>('Dashboard');

  readonly toggleSidebar = output<void>();
  readonly openProfile = output<void>();
  readonly confirmLogout = output<void>();

  ngOnInit(): void {
    this.updatePath(this.router.url);
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        this.updatePath((event as NavigationEnd).urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  private updatePath(url: string): void {
    // Split URL and filter empty parts
    const parts = url.split('/').filter(p => p && !p.startsWith('?'));
    if (parts.length === 0) {
      this.currentPath.set('Dashboard');
      return;
    }

    // Map segments to human-readable names
    const segmentMap: Record<string, string> = {
      'payment': 'Payment',
      'cashreceipt': 'Cash Receipt',
      'invoice': 'Facturas',
      'paymentmethod': 'Payment Method',
      'commercial': 'Commercial',
      'discount': 'Descuentos',
      'customer-discount': 'Descuentos por Cliente',
      'seller': 'Vendedores',
      'purchases': 'Compras',
      'tables': 'Mesas',
      'sales': 'Ventas',
      'inventory': 'Inventory',
      'transfer': 'Transfer',
      'categories': 'Categorías',
      'product': 'Productos',
      'recipes': 'Recetas',
      'locations': 'Sedes',
      'inventor': 'Inventory' // handle path typo if any
    };

    const breadcrumbs = parts.map(part => segmentMap[part.toLowerCase()] || part);
    this.currentPath.set(breadcrumbs.join(' / '));
  }
}
