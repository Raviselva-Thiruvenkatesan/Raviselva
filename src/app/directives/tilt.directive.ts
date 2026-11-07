import { Directive, ElementRef, HostListener, Input, NgZone } from '@angular/core';

/** Subtle 3D tilt that follows the pointer. Disabled for touch and reduced-motion users. */
@Directive({
  selector: '[appTilt]',
  standalone: true
})
export class TiltDirective {
  @Input() tiltMax = 8;

  private readonly enabled =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private frame = 0;

  constructor(private el: ElementRef<HTMLElement>, private zone: NgZone) {}

  @HostListener('pointermove', ['$event'])
  onMove(event: PointerEvent) {
    if (!this.enabled) return;
    const el = this.el.nativeElement;
    cancelAnimationFrame(this.frame);
    this.zone.runOutsideAngular(() => {
      this.frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        el.style.transition = 'transform 0.1s ease-out';
        el.style.transform =
          `perspective(900px) rotateX(${(-y * this.tiltMax).toFixed(2)}deg) ` +
          `rotateY(${(x * this.tiltMax).toFixed(2)}deg) translateY(-6px)`;
        el.style.setProperty('--glare-x', `${(x + 0.5) * 100}%`);
        el.style.setProperty('--glare-y', `${(y + 0.5) * 100}%`);
      });
    });
  }

  @HostListener('pointerleave')
  onLeave() {
    if (!this.enabled) return;
    cancelAnimationFrame(this.frame);
    const el = this.el.nativeElement;
    el.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    el.style.transform = '';
  }
}
