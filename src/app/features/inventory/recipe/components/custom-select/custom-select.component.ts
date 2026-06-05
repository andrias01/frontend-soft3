import {
  Component, EventEmitter, HostListener,
  Input, OnChanges, Output, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cs-wrapper" [class.cs-open]="isOpen" [class.cs-disabled]="disabled" [class.cs-error]="hasError"
         (click)="$event.stopPropagation()">

      <button type="button" class="cs-trigger" (click)="toggle()" [disabled]="disabled">
        <span class="cs-value" [class.cs-placeholder]="!selectedLabel">
          {{ selectedLabel || placeholder }}
        </span>
        <svg class="cs-arrow" [class.cs-arrow-up]="isOpen"
             xmlns="http://www.w3.org/2000/svg" width="16" height="16"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      @if (isOpen) {
        <div class="cs-panel">

          @if (loading) {
            <div class="cs-empty">
              <span class="cs-spinner"></span>
              <span>Cargando...</span>
            </div>
          } @else if (options.length === 0) {
            <div class="cs-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>{{ emptyText }}</span>
            </div>
          } @else {
            @for (opt of options; track opt.value) {
              <button
                type="button"
                class="cs-option"
                [class.cs-option-selected]="opt.value === value"
                [class.cs-option-disabled]="opt.disabled"
                [disabled]="opt.disabled"
                (click)="select(opt)"
              >
                <span>{{ opt.label }}</span>
                @if (opt.value === value) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                       viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                }
              </button>
            }
          }

        </div>
      }
    </div>
  `,
  styles: [`
    .cs-wrapper {
      position: relative;
      width: 100%;
    }

    .cs-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5625rem 0.875rem;
      background: #FFF8F2;
      border: 1.5px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      color: #222222;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }

    .cs-trigger:hover:not(:disabled) {
      border-color: #FF6B35;
    }

    .cs-open .cs-trigger {
      border-color: #FF6B35;
      box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.12);
    }

    .cs-error .cs-trigger {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .cs-disabled .cs-trigger {
      background: #f3f4f6;
      color: #9ca3af;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .cs-value { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cs-placeholder { color: #9ca3af; }

    .cs-arrow {
      flex-shrink: 0;
      color: #FF6B35;
      transition: transform 0.2s ease;
    }

    .cs-arrow-up { transform: rotate(180deg); }

    /* ── Panel ── */
    .cs-panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: #ffffff;
      border: 1.5px solid #e5e7eb;
      border-radius: 0.625rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      z-index: 200;
      overflow: hidden;
      animation: cs-drop 0.15s ease;
    }

    @keyframes cs-drop {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Options ── */
    .cs-option {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 1rem;
      background: none;
      border: none;
      font-size: 0.9375rem;
      color: #222222;
      cursor: pointer;
      text-align: left;
      transition: background-color 0.15s;
      border-bottom: 1px solid #f9fafb;
    }

    .cs-option:last-child { border-bottom: none; }

    .cs-option:hover:not(:disabled) {
      background-color: #FFF8F2;
      color: #FF6B35;
    }

    .cs-option-selected {
      background-color: #fff3ec;
      color: #FF6B35;
      font-weight: 600;
    }

    .cs-option-selected svg { color: #FF6B35; }

    .cs-option-disabled {
      color: #9ca3af;
      cursor: not-allowed;
      opacity: 0.6;
    }

    /* ── Empty / loading state ── */
    .cs-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .cs-empty svg { flex-shrink: 0; }

    .cs-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e5e7eb;
      border-top-color: #FF6B35;
      border-radius: 50%;
      animation: cs-spin 0.7s linear infinite;
      flex-shrink: 0;
    }

    @keyframes cs-spin { to { transform: rotate(360deg); } }
  `]
})
export class CustomSelectComponent implements OnChanges {
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Seleccionar...';
  @Input() value = '';
  @Input() disabled = false;
  @Input() hasError = false;
  @Input() loading = false;
  @Input() emptyText = 'Sin opciones disponibles';
  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;
  selectedLabel = '';

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['options']) {
      this.selectedLabel = this.options.find(o => o.value === this.value)?.label ?? '';
    }
  }

  toggle(): void {
    if (!this.disabled) this.isOpen = !this.isOpen;
  }

  select(opt: SelectOption): void {
    if (opt.disabled) return;
    this.value = opt.value;
    this.selectedLabel = opt.label;
    this.valueChange.emit(opt.value);
    this.isOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isOpen = false;
  }
}
