import { Injectable, OnDestroy, Signal, signal } from '@angular/core';

/**
 * Live device/user preferences that the animations depend on. Each value is a signal that
 * updates when the setting changes (e.g. the user turns on "Reduce motion" in the OS).
 */
@Injectable({ providedIn: 'root' })
export class MotionService implements OnDestroy {
  /** User asked the OS to minimise animation. */
  readonly reducedMotion: Signal<boolean>;
  /** A mouse/trackpad that can hover (not a touch screen). */
  readonly finePointer: Signal<boolean>;
  /** Phone-sized viewport. */
  readonly small: Signal<boolean>;

  private cleanup: Array<() => void> = [];

  constructor() {
    this.reducedMotion = this.watch('(prefers-reduced-motion: reduce)');
    this.finePointer = this.watch('(hover: hover) and (pointer: fine)');
    this.small = this.watch('(max-width: 768px)');
  }

  private watch(query: string): Signal<boolean> {
    const mql = window.matchMedia(query);
    const value = signal(mql.matches);
    const onChange = (e: MediaQueryListEvent) => value.set(e.matches);
    mql.addEventListener('change', onChange);
    this.cleanup.push(() => mql.removeEventListener('change', onChange));
    return value.asReadonly();
  }

  ngOnDestroy() {
    this.cleanup.forEach(fn => fn());
  }
}
