import { Directive, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MotionService } from '../services/motion.service';

// Keep the card's own CSS transitions (shadow/background) alongside the transform easing.
const BASE_TRANSITION = 'box-shadow 0.3s ease, background 0.4s ease';

/** Subtle 3D tilt that follows the pointer. Disabled for touch and reduced-motion users. */
@Directive({
  selector: '[appTilt]',
  standalone: true
})
export class TiltDirective implements OnInit, OnDestroy {
  @Input() tiltMax = 8;

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private motion = inject(MotionService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private frame = 0;
  private resetTimer?: ReturnType<typeof setTimeout>;

  // Plain DOM listeners: a @HostListener would trigger change detection on every pointer move.
  private readonly onMove = (event: PointerEvent) => {
    if (!this.enabled()) return;
    clearTimeout(this.resetTimer);
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const rect = this.el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      this.el.style.transition = `transform 0.1s ease-out, ${BASE_TRANSITION}`;
      this.el.style.transform =
        `perspective(900px) rotateX(${(-y * this.tiltMax).toFixed(2)}deg) ` +
        `rotateY(${(x * this.tiltMax).toFixed(2)}deg) translateY(-6px)`;
      this.el.style.setProperty('--glare-x', `${(x + 0.5) * 100}%`);
      this.el.style.setProperty('--glare-y', `${(y + 0.5) * 100}%`);
    });
  };

  private readonly onLeave = () => {
    cancelAnimationFrame(this.frame);
    if (!this.el.style.transform) return;
    this.el.style.transition = `transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), ${BASE_TRANSITION}`;
    this.el.style.transform = '';
    // Hand control back to the stylesheet once the reset has eased out.
    this.resetTimer = setTimeout(() => (this.el.style.transition = ''), 550);
  };

  ngOnInit() {
    if (!this.isBrowser) return;
    this.el.addEventListener('pointermove', this.onMove, { passive: true });
    this.el.addEventListener('pointerleave', this.onLeave, { passive: true });
  }

  private enabled() {
    return this.motion.finePointer() && !this.motion.reducedMotion();
  }

  ngOnDestroy() {
    if (!this.isBrowser) return;
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerleave', this.onLeave);
    cancelAnimationFrame(this.frame);
    clearTimeout(this.resetTimer);
  }
}
