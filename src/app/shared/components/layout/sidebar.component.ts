import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Feature {
  name: string;
  path: string;
}

interface Module {
  name: string;
  expanded: boolean;
  features: Feature[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="isCollapsed()">
      <!-- Floating Toggle Button in the middle -->
      <button class="btn-floating-toggle" (click)="toggleCollapse.emit()" [attr.aria-label]="isCollapsed() ? 'Expandir menú' : 'Colapsar menú'">
        @if (isCollapsed()) {
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="toggle-svg"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="toggle-svg"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        }
      </button>

      <div class="logo-container">
        <div class="logo-icon">🍽️</div>
        <h2 class="logo-text">EatUp</h2>
      </div>

      <nav class="nav-menu">
        @for (module of modules(); track module.name) {
          <div class="nav-section">
            <!-- Header of Section -->
            <button 
              class="section-title" 
              (click)="toggleModule(module.name)" 
              [attr.aria-expanded]="module.expanded"
              [title]="module.name"
            >
              <div class="section-title-left">
                <span class="module-icon" [innerHTML]="getModuleIcon(module.name)"></span>
                <span class="module-label">{{ module.name }}</span>
              </div>
              <span class="chevron" [class.rotated]="module.expanded">▼</span>
            </button>

            <!-- Feature Links -->
            @if (module.expanded && !isCollapsed()) {
              <ul class="nav-links">
                @for (feature of module.features; track feature.path) {
                  <li>
                    <a [routerLink]="feature.path" routerLinkActive="active" [title]="feature.name">
                      <span class="feature-icon" [innerHTML]="getFeatureIcon(feature.path)"></span>
                      <span class="feature-label">{{ feature.name }}</span>
                    </a>
                  </li>
                }
              </ul>
            }

            <!-- Collapsed Hover Popover with Feature Names & Icons -->
            @if (isCollapsed()) {
              <div class="collapsed-popover">
                <div class="popover-header">{{ module.name }}</div>
                <ul class="popover-links">
                  @for (feature of module.features; track feature.path) {
                    <li>
                      <a [routerLink]="feature.path" routerLinkActive="active">
                        <span class="feature-icon" [innerHTML]="getFeatureIcon(feature.path)"></span>
                        <span class="feature-label">{{ feature.name }}</span>
                      </a>
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        }
      </nav>

      <!-- Sidebar Footer with branding -->
      <div class="sidebar-footer">
        <div class="brand-text">
          @if (isCollapsed()) {
            <span class="brand-name-min" title="EatUp v1 UCO">v1</span>
          } @else {
            <span class="brand-name">EatUp <span class="highlight">v1</span> UCO</span>
          }
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .sidebar {
      width: 260px;
      height: 100%;
      background: linear-gradient(180deg, #1f2022 0%, #111214 100%);
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: visible;
      position: relative;
    }

    .sidebar.collapsed {
      width: 70px;
    }

    /* ── Floating Toggle Button ───────────────────────────────────────── */
    .btn-floating-toggle {
      position: absolute;
      top: 50%;
      right: -13px;
      transform: translateY(-50%);
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background-color: #111214;
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      color: #ff6b35;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
      z-index: 101;
      transition: all 0.2s ease-in-out;
      outline: none;
      padding: 0;
    }

    .btn-floating-toggle:hover {
      background-color: #ff6b35;
      color: #ffffff;
      border-color: #ff6b35;
      box-shadow: 0 0 10px rgba(255, 107, 53, 0.4);
    }

    .toggle-svg {
      width: 12px;
      height: 12px;
    }

    .logo-container {
      padding: 1.5rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      height: 64px;
      overflow: hidden;
    }

    .logo-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .logo-text {
      margin: 0;
      color: #ffffff;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      white-space: nowrap;
    }

    .sidebar.collapsed .logo-text {
      opacity: 0;
      transform: translateX(-10px);
      pointer-events: none;
    }

    .nav-menu {
      flex: 1;
      padding: 1.25rem 0.75rem;
      overflow-y: auto;
      overflow-x: visible;
    }

    /* Scrollbar style */
    .nav-menu::-webkit-scrollbar {
      width: 4px;
    }
    .nav-menu::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
    }

    .nav-section {
      margin-bottom: 1rem;
      position: relative;
    }

    .section-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #94a3b8;
      padding: 0.75rem 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      border-radius: 0.5rem;
      transition: all 0.2s ease;
    }

    .section-title:hover {
      color: #ffffff;
      background-color: rgba(255, 255, 255, 0.03);
    }

    .section-title-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      overflow: hidden;
      white-space: nowrap;
    }

    .module-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      color: #ff6b35;
      flex-shrink: 0;
    }

    .module-label {
      transition: opacity 0.2s ease;
    }

    .sidebar.collapsed .module-label,
    .sidebar.collapsed .chevron {
      opacity: 0;
      pointer-events: none;
      display: none;
    }

    .sidebar.collapsed .section-title {
      justify-content: center;
      padding: 0.75rem 0;
    }

    .chevron {
      font-size: 0.6rem;
      transition: transform 0.3s ease;
      color: #64748b;
    }

    .chevron.rotated {
      transform: rotate(-180deg);
    }

    .nav-links {
      list-style: none;
      padding: 0;
      margin: 0.25rem 0 0 0.5rem;
    }

    .nav-links li {
      margin-bottom: 0.25rem;
    }

    .nav-links a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      color: #94a3b8;
      text-decoration: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .nav-links a:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }

    .nav-links a.active {
      background-color: #ff6b35;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
    }

    .feature-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: currentColor;
      opacity: 0.8;
      flex-shrink: 0;
    }

    /* ── Collapsed Hover Popover ───────────────────────────────────────── */
    .collapsed-popover {
      position: absolute;
      left: 100%;
      top: 0;
      margin-left: 0.75rem;
      width: 200px;
      background: #18191b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.5rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
      padding: 0.5rem;
      opacity: 0;
      visibility: hidden;
      transform: translateX(-8px) scale(0.96);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 100;
    }

    .nav-section:hover .collapsed-popover {
      opacity: 1;
      visibility: visible;
      transform: translateX(0) scale(1);
    }

    .popover-header {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #ff6b35;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 0.35rem;
      letter-spacing: 0.05em;
    }

    .popover-links {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .popover-links li {
      margin-bottom: 0.2rem;
    }

    .popover-links a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      color: #94a3b8;
      text-decoration: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .popover-links a:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }

    .popover-links a.active {
      background-color: #ff6b35;
      color: #ffffff;
    }

    /* ── Footer / Branding ────────────────────────────────────────────── */
    .sidebar-footer {
      padding: 1rem 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: rgba(0, 0, 0, 0.15);
      min-height: 48px;
    }

    .brand-text {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.5px;
      white-space: nowrap;
      text-align: center;
    }

    .brand-name .highlight {
      color: #ff6b35;
      font-weight: 700;
    }

    .brand-name-min {
      background-color: rgba(255, 107, 53, 0.1);
      color: #ff6b35;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 800;
    }
  `]
})
export class SidebarComponent {
  private readonly sanitizer = inject(DomSanitizer);
  isCollapsed = input<boolean>(false);
  toggleCollapse = output<void>();

  protected readonly modules = signal<Module[]>([
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
        { name: 'Clientes', path: '/commercial/clients' },
        { name: 'Vendedores', path: '/commercial/seller' },
        { name: 'Compras',    path: '/commercial/purchases' },
        { name: 'Mesas',         path: '/commercial/tables' },
        { name: 'Ventas',        path: '/commercial/sales' },
        { name: 'Proveedores',   path: '/commercial/provider' }
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

  toggleModule(moduleName: string): void {
    if (this.isCollapsed()) {
      this.toggleCollapse.emit();
    }
    this.modules.update(mods => mods.map(m =>
      m.name === moduleName ? { ...m, expanded: !m.expanded } : m
    ));
  }

  // Dictionary of SVG icons for modules returning SafeHtml
  getModuleIcon(name: string): SafeHtml {
    const key = name.toLowerCase();
    let svg = '';
    
    if (key === 'payment') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>`;
    } else if (key === 'commercial') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.5a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0-.75.75v3.25c0 .414.336.75.75.75Z" /></svg>`;
    } else if (key === 'inventory') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>`;
    } else if (key.includes('pay') || key.includes('caja') || key.includes('fact') || key.includes('vent') || key.includes('sale') || key.includes('bill') || key.includes('receipt')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>`;
    } else if (key.includes('commercial') || key.includes('tienda') || key.includes('shop') || key.includes('seller') || key.includes('vend')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.5a.75.75 0 0 0 .75-.75V14a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0-.75.75v3.25c0 .414.336.75.75.75Z" /></svg>`;
    } else if (key.includes('inventory') || key.includes('prod') || key.includes('recet') || key.includes('recipe') || key.includes('transf') || key.includes('cat') || key.includes('loc') || key.includes('sede') || key.includes('stock')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>`;
    } else if (key.includes('user') || key.includes('admin') || key.includes('perfil') || key.includes('profile') || key.includes('config') || key.includes('setting') || key.includes('ajuste')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /></svg>`;
    } else {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.625-3.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zM3 16.125C3 15.228 3.728 14.5 4.625 14.5h14.75c.897 0 1.625.728 1.625 1.625v1.25c0 .897-.728 1.625-1.625 1.625H4.625C3.728 19 3 18.272 3 17.375v-1.25z" /></svg>`;
    }

    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  // Dictionary of SVG icons for features returning SafeHtml
  getFeatureIcon(path: string): SafeHtml {
    const key = path.toLowerCase();
    let svg = '';
    
    if (key.includes('cashreceipt')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14.25l6-6m4.5-3.493V21a1.125 1.125 0 0 1-1.125 1.125H6.62M19.5 5.25V3.007c0-.621-.504-1.125-1.125-1.125h-5.62m5.62 3.375c0 .621-.504 1.125-1.125 1.125h-5.62M19.5 5.25H9.75M9 14.25a2.25 2.25 0 0 0 3 0m-3 0a2.25 2.25 0 0 1 0-3m3 3a2.25 2.25 0 0 0 0-3m0 0V3.007c0-.621-.504-1.125-1.125-1.125h-5.62m0 0a2.25 2.25 0 0 0-2.25 2.25v16.125c0 .621.504 1.125 1.125 1.125H16.5" /></svg>`;
    } else if (key.includes('invoice')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" /></svg>`;
    } else if (key.includes('paymentmethod')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" /></svg>`;
    } else if (key.includes('customer-discount')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>`;
    } else if (key.includes('/commercial/clients') || key.endsWith('/clients')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 0 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 0 1-5.25 0 2.625 2.625 0 0 1 5.25 0Zm-13.5 0a2.25 2.25 0 0 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>`;
    } else if (key.includes('discount')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9.5 8.25l.008-.008H9.5V8.25zm0 2.25l.008-.008H9.5V10.5zm-.25 2.25H9.5V12.75zm0 2.25H9.5V15zm0 2.25H9.5v-.008h-.008v.008zm1.5-11.25h.008v-.008H11v.008zm0 2.25h.008v-.008H11V10.5zm0 2.25h.008v-.008H11V12.75zm0 2.25h.008V15H11v.25zm0 2.25h.008v-.008H11v.008zm1.5-11.25h.008v-.008h-.008v.008zm0 2.25h.008v-.008h-.008V10.5zm0 2.25h.008v-.008h-.008v.25zm0 2.25h.008V15h-.008v.25zM12 21a9.003 9.003 0 008.354-5.646 9.003 9.003 0 00-8.354-5.646V21zm0 0a9.003 9.003 0 01-8.354-5.646 9.003 9.003 0 018.354-5.646V21z" /></svg>`;
    } else if (key.includes('seller')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>`;
    } else if (key.includes('purchases')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z" /></svg>`;
    } else if (key.includes('tables')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" /></svg>`;
    } else if (key.includes('provider')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>`;
    } else if (key.includes('sales')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>`;
    } else if (key.includes('transfer')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>`;
    } else if (key.includes('categories')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.125 1.125 0 0 0 1.591 0l4.318-4.318a1.125 1.125 0 0 0 0-1.591l-9.581-9.581c-.422-.422-.994-.659-1.59-.659V3z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" /></svg>`;
    } else if (key.includes('product')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>`;
    } else if (key.includes('recipes')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>`;
    } else if (key.includes('locations')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>`;
    } else if (key.includes('add') || key.includes('new') || key.includes('create') || key.includes('nuevo') || key.includes('crear')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>`;
    } else if (key.includes('edit') || key.includes('update') || key.includes('modify') || key.includes('editar') || key.includes('modificar')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>`;
    } else if (key.includes('list') || key.includes('view') || key.includes('index') || key.includes('show') || key.includes('ver') || key.includes('listar')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z" /></svg>`;
    } else if (key.includes('delete') || key.includes('remove') || key.includes('cancel') || key.includes('eliminar') || key.includes('borrar')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;
    } else if (key.includes('detail') || key.includes('info') || key.includes('detalle')) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 1 1 1.083.687l-.551 1.65a1.875 1.875 0 0 0 2.192 2.448l.041-.02a.75.75 0 1 1 .748 1.302l-.041.02a3.375 3.375 0 0 1-3.945-4.406l.551-1.65a.375.375 0 0 0-.438-.49l-.041.02a.75.75 0 1 1-.748-1.302zM12 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" /></svg>`;
    } else {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" /></svg>`;
    }

    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
