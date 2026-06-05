import { Component, input } from '@angular/core';

@Component({
  selector: 'eatup-empty-state',
  standalone: true,
  template: `
    <section class="empty-state">
      <div class="empty-icon">{{ icon() }}</div>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
    </section>
  `,
  styles: [
    `
      .empty-state {
        align-items: center;
        background: #FFF8F2;
        border: 1px dashed rgba(27, 27, 27, 0.14);
        border-radius: 8px;
        color: #1B1B1B;
        display: flex;
        flex-direction: column;
        min-height: 260px;
        justify-content: center;
        padding: 28px;
        text-align: center;
      }

      .empty-icon {
        align-items: center;
        background: rgba(46, 196, 182, 0.12);
        border-radius: 999px;
        color: #2EC4B6;
        display: inline-flex;
        font-size: 26px;
        height: 58px;
        justify-content: center;
        margin-bottom: 18px;
        width: 58px;
      }

      h3 {
        color: #222222;
        font-size: 18px;
        margin: 0 0 8px;
      }

      p {
        line-height: 1.6;
        margin: 0;
        max-width: 460px;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input('∅');
  readonly title = input('Sin resultados');
  readonly description = input('No hay información para mostrar con los filtros actuales.');
}
