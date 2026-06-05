import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecipeResponse } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-deactivate-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="modal-overlay" (click)="onOpenChange.emit(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-icon">🚫</div>
          <h2 class="modal-title">Inactivar receta</h2>
          <p class="modal-body">
            ¿Estás seguro de que deseas inactivar la receta
            <strong>{{ recipe?.name }}</strong>?
            Esta acción desactivará la receta del menú y no podrá ser usada en ventas.
          </p>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="onOpenChange.emit(false)">Cancelar</button>
            <button class="btn-danger" (click)="onConfirm.emit()">Sí, inactivar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal {
      background: #fff;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    }
    .modal-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .modal-title {
      margin: 0 0 0.75rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: #222222;
    }
    .modal-body {
      color: #4b5563;
      font-size: 0.9375rem;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .modal-footer {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }
    .btn-secondary {
      padding: 0.625rem 1.25rem;
      border: 1.5px solid #d1d5db;
      background: #fff;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .btn-secondary:hover { border-color: #9ca3af; }
    .btn-danger {
      padding: 0.625rem 1.25rem;
      background: #ef4444;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn-danger:hover { background: #dc2626; }
  `]
})
export class RecipeDeactivateModalComponent {
  @Input() open = false;
  @Input() recipe: RecipeResponse | null = null;
  @Output() onOpenChange = new EventEmitter<boolean>();
  @Output() onConfirm = new EventEmitter<void>();
}
