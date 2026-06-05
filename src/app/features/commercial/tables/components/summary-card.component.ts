import { Component, input } from '@angular/core';

@Component({
  selector: 'eatup-summary-card',
  standalone: true,
  template: `
    <article class="summary-card">
      <div class="card-top">
        <span class="icon" [style.background]="accentSoft()">{{ icon() }}</span>
        <span class="trend" [class.down]="trendDirection() === 'down'">{{ trend() }}</span>
      </div>
      <p>{{ label() }}</p>
      <strong>{{ value() }}</strong>
      <div class="progress" aria-hidden="true">
        <span [style.width.%]="progress()" [style.background]="accent()"></span>
      </div>
    </article>
  `,
  styles: [
    `
      .summary-card {
        background: #FFF8F2;
        border: 1px solid rgba(27, 27, 27, 0.08);
        border-radius: 8px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
        padding: 18px;
        transition:
          transform 180ms ease,
          box-shadow 180ms ease;
      }

      .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 22px 50px rgba(15, 23, 42, 0.08);
      }

      .card-top {
        align-items: center;
        display: flex;
        justify-content: space-between;
        margin-bottom: 18px;
      }

      .icon {
        align-items: center;
        border-radius: 8px;
        display: inline-flex;
        font-size: 18px;
        height: 40px;
        justify-content: center;
        width: 40px;
      }

      .trend {
        color: #2EC4B6;
        font-size: 12px;
        font-weight: 700;
      }

      .trend.down {
        color: #ef4444;
      }

      p {
        color: #1B1B1B;
        font-size: 13px;
        margin: 0 0 6px;
      }

      strong {
        color: #222222;
        display: block;
        font-size: 28px;
        letter-spacing: 0;
        line-height: 1.1;
      }

      .progress {
        background: rgba(46, 196, 182, 0.12);
        border-radius: 999px;
        height: 6px;
        margin-top: 16px;
        overflow: hidden;
      }

      .progress span {
        border-radius: inherit;
        display: block;
        height: 100%;
        transition: width 240ms ease;
      }
    `,
  ],
})
export class SummaryCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input('•');
  readonly accent = input('#FF6B35');
  readonly accentSoft = input('#FFE6DA');
  readonly progress = input(0);
  readonly trend = input('+0%');
  readonly trendDirection = input<'up' | 'down'>('up');
}
