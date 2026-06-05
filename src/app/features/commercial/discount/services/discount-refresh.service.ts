import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DiscountRefreshService {
  private readonly trigger$ = new Subject<void>();
  readonly onRefresh$ = this.trigger$.asObservable();

  refresh(): void {
    this.trigger$.next();
  }
}