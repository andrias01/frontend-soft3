import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@features/user/services/auth.service';
import { ProfilePanelComponent } from '@features/user/components/profile-panel/profile-panel.component';
import { SidebarComponent } from './sidebar.component';
import { HeaderComponent } from './header.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    ProfilePanelComponent, 
    SidebarComponent, 
    HeaderComponent
  ],
  template: `
    <div class="layout-container" [class.sidebar-collapsed]="isSidebarCollapsed()" [class.mobile-sidebar-open]="isMobileSidebarOpen()">
      <!-- Mobile Sidebar Backdrop Overlay -->
      @if (isMobileSidebarOpen()) {
        <div class="mobile-sidebar-backdrop" (click)="closeMobileSidebar()"></div>
      }

      <!-- Sidebar Component Wrapper -->
      <div class="sidebar-wrapper">
        <app-sidebar 
          [isCollapsed]="isSidebarCollapsed()" 
          (toggleCollapse)="toggleSidebar()"
        />
      </div>

      <!-- Main Content Area -->
      <main class="content-wrapper">
        <!-- Header Component -->
        <app-header 
          (toggleSidebar)="handleHamburgerClick()"
          (openProfile)="openUserPanel()"
          (confirmLogout)="confirmLogout()"
        />

        <!-- Router Outlet Main Content -->
        <section class="main-view">
          <router-outlet></router-outlet>
        </section>
      </main>

      <!-- Profile Sidebar Panel -->
      @if (isUserPanelOpen()) {
        <app-profile-panel (panelClosed)="closeUserPanel()" />
      }

      <!-- Logout Confirmation Modal -->
      @if (showLogoutModal()) {
        <div class="modal-backdrop" (click)="cancelLogout()">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <div class="modal-icon">🔒</div>
            <h3>¿Cerrar sesión?</h3>
            <p>Tu sesión se cerrará y tendrás que volver a iniciar sesión para acceder.</p>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="cancelLogout()">Cancelar</button>
              <button class="btn-confirm" (click)="doLogout()">Sí, cerrar sesión</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      --sidebar-width-expanded: 260px;
      --sidebar-width-collapsed: 70px;
      --top-bar-height: 64px;
      --primary-color: var(--color-primary, #ff6b35);
      --bg-color: var(--color-background, #fff8f2);
      --text-main: var(--color-text, #222222);
      --border-color: #e2e8f0;
      display: block;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }

    .layout-container {
      display: flex;
      height: 100%;
      width: 100%;
      background-color: var(--bg-color);
      position: relative;
    }

    /* Sidebar Wrapper & Collapsing Layout on Desktop */
    .sidebar-wrapper {
      width: var(--sidebar-width-expanded);
      height: 100%;
      flex-shrink: 0;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 50;
    }

    .sidebar-collapsed .sidebar-wrapper {
      width: var(--sidebar-width-collapsed);
    }

    /* Content Area Layout */
    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .main-view {
      flex: 1;
      padding: 2rem;
      overflow-y: auto;
      background-color: var(--bg-color);
    }

    /* Mobile Backdrop Overlay */
    .mobile-sidebar-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 40;
      animation: fadeIn 0.2s ease-out;
    }

    /* ── Modal logout ─────────────────────────────────────────────────── */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn .15s ease;
    }

    .modal-box {
      background: #ffffff;
      border-radius: 16px;
      padding: 32px 28px;
      max-width: 380px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideUp .2s ease;
      border: 1px solid #e2e8f0;
    }

    .modal-icon { 
      font-size: 36px; 
      margin-bottom: 12px; 
    }

    .modal-box h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 8px;
    }

    .modal-box p {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 24px;
      line-height: 1.5;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn-cancel {
      flex: 1;
      padding: 10px;
      border: 1.5px solid #e2e8f0;
      background: #ffffff;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: background .15s;
    }

    .btn-cancel:hover { 
      background: #f8fafc; 
    }

    .btn-confirm {
      flex: 1;
      padding: 10px;
      border: none;
      background: var(--primary-color);
      color: #ffffff;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
    }

    .btn-confirm:hover { 
      opacity: .9; 
    }

    /* Animations */
    @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
    @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

    /* Responsive Queries */
    @media (max-width: 768px) {
      .sidebar-wrapper {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 50;
      }

      .mobile-sidebar-open .sidebar-wrapper {
        transform: translateX(0);
      }

      .main-view {
        padding: 1rem;
      }
    }
  `]
})
export class LayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  protected readonly isSidebarCollapsed = signal(false);
  protected readonly isMobileSidebarOpen = signal(false);

  protected readonly isUserPanelOpen  = signal(false);
  protected readonly showLogoutModal  = signal(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(collapsed => !collapsed);
  }

  handleHamburgerClick(): void {
    if (window.innerWidth <= 768) {
      this.isMobileSidebarOpen.set(true);
    } else {
      this.toggleSidebar();
    }
  }
      
  protected readonly modules = signal([
    {
      name: 'Payment',
      expanded: false,
      features: [
        { name: 'Cash Receipt',   path: '/payment/cashreceipt' },
        { name: 'Facturas',       path: '/payment/invoice' },
        { name: 'Payment Method', path: '/payment/paymentmethod' }
      ]
    },
    {
      name: 'Commercial',
      expanded: false,
      features: [
        { name: 'Descuentos', path: '/commercial/discount' },
        { name: 'Descuentos por Cliente', path: '/commercial/customer-discount' },
        { name: 'Vendedores', path: '/commercial/seller' },
        { name: 'Compras',    path: '/commercial/purchases' },
        { name: 'Proveedores', path: '/commercial/provider' },
        { name: 'Mesas',      path: '/commercial/tables' },
        { name: 'Ventas',     path: '/commercial/sales' }
      ]
    },
    {
      name: 'Inventory',
      expanded: true,
      features: [
        { name: 'Transfer',   path: '/inventory/transfer'   },
        { name: 'Categorías', path: '/inventory/categories' },
        { name: 'Productos',  path: '/inventory/product'    },
        { name: 'Recetas',    path: '/inventory/recipes'    },
        { name: 'Sedes',      path: '/inventor/locations' }
      ]
    }
  ]);

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }

  openUserPanel():  void { this.isUserPanelOpen.set(true);  }
  closeUserPanel(): void { this.isUserPanelOpen.set(false); }

  confirmLogout(): void { this.showLogoutModal.set(true);  }
  cancelLogout():  void { this.showLogoutModal.set(false); }

  doLogout(): void {
    this.showLogoutModal.set(false);
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}