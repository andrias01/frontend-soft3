import { Component, input } from '@angular/core';

@Component({
  selector: 'eatup-loading-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-list">
      @for (row of rowsArray(); track row) {
        <div class="skeleton-row">
          <span></span>
          <span></span>
          <span></span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .skeleton-list {
        display: grid;
        gap: 12px;
      }

      .skeleton-row {
        background: #FFF8F2;
        border: 1px solid rgba(27, 27, 27, 0.08);
        border-radius: 8px;
        display: grid;
        gap: 14px;
        grid-template-columns: 1.2fr 0.8fr 0.5fr;
        padding: 18px;
      }

      span {
        animation: pulse 1.25s ease-in-out infinite;
        background: linear-gradient(90deg, rgba(46, 196, 182, 0.18), #fff, rgba(46, 196, 182, 0.18));
        background-size: 220% 100%;
        border-radius: 999px;
        height: 14px;
      }

      @keyframes pulse {
        from {
          background-position: 100% 0;
        }
        to {
          background-position: -100% 0;
        }
      }

      @media (max-width: 720px) {
        .skeleton-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LoadingSkeletonComponent {
  readonly rows = input(4);

  rowsArray(): number[] {
    return Array.from({ length: this.rows() }, (_, index) => index);
  }
}
