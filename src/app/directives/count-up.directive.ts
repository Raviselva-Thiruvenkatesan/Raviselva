import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { MotionService } from '../services/motion.service';

/**
 * Animates a value like "5+" or "100%" from 0 when it scrolls into view.
 * Put it on an aria-hidden element and give screen readers the real value in a
 * visually-hidden sibling, so they never hear an in-between number.
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnInit, OnDestroy {
  @Input('appCountUp') value = '';
  @Input() countDuration = 1600;

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private motion = inject(MotionService);
  private observer?: IntersectionObserver;
  private frame = 0;

  ngOnInit() {
    const el = this.el;
    const match = this.value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);

    if (!match || this.motion.reducedMotion() || !('IntersectionObserver' in window)) {
      el.textContent = this.value;
      return;
    }

    const [, prefix, num, suffix] = match;
    const target = parseFloat(num);
    const decimals = num.includes('.') ? num.split('.')[1].length : 0;
    el.textContent = `${prefix}${(0).toFixed(decimals)}${suffix}`;

    this.observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      this.observer?.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / this.countDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = `${prefix}${(target * eased).toFixed(decimals)}${suffix}`;
        if (t < 1) this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    this.observer.observe(el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
  }
}
