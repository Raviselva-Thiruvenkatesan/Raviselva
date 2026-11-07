import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';

/** Page-level effects: reading-progress bar, floating back-to-top button and a pointer glow. */
@Component({
  selector: 'app-scroll-fx',
  standalone: true,
  template: `
    <div class="scroll-progress" aria-hidden="true">
      <div class="scroll-progress-bar" #bar></div>
    </div>

    <div class="cursor-glow" #glow aria-hidden="true"></div>

    <button
      type="button"
      class="back-to-top"
      [class.visible]="showTop()"
      [attr.tabindex]="showTop() ? 0 : -1"
      [attr.aria-hidden]="!showTop()"
      aria-label="Back to top"
      (click)="toTop()">
      <i class="bi bi-arrow-up" aria-hidden="true"></i>
    </button>
  `,
  styles: [`
    .scroll-progress {
      position: fixed; inset: 0 0 auto 0; height: 3px; z-index: 1100; pointer-events: none;
    }
    .scroll-progress-bar {
      height: 100%; width: 100%; transform-origin: 0 50%; transform: scaleX(0);
      background: linear-gradient(90deg, var(--blue-neon), var(--purple), var(--indigo));
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.6);
    }
    .cursor-glow {
      position: fixed; top: 0; left: 0; width: 420px; height: 420px; margin: -210px 0 0 -210px;
      border-radius: 50%; pointer-events: none; z-index: 0; opacity: 0;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, transparent 65%);
      transition: opacity 0.4s ease; will-change: transform;
    }
    :host-context([data-theme="dark"]) .cursor-glow {
      background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 65%);
    }
    .back-to-top {
      position: fixed; right: 24px; bottom: 24px; z-index: 990; /* below the navbar / mobile menu */
      width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer;
      display: grid; place-items: center; font-size: 1.25rem; color: #fff;
      background: var(--gradient-primary); box-shadow: var(--shadow-md);
      opacity: 0; transform: translateY(20px) scale(0.8); pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
    }
    .back-to-top.visible { opacity: 1; transform: none; pointer-events: auto; }
    .back-to-top:hover { box-shadow: var(--shadow-neon); transform: translateY(-3px); }
  `]
})
export class ScrollFxComponent implements OnInit, OnDestroy {
  @ViewChild('bar', { static: true }) bar!: ElementRef<HTMLElement>;
  @ViewChild('glow', { static: true }) glow!: ElementRef<HTMLElement>;

  showTop = signal(false);

  private frame = 0;
  private cleanup: Array<() => void> = [];

  constructor(private zone: NgZone) {}

  ngOnInit() {
    this.zone.runOutsideAngular(() => {
      const onScroll = () => {
        cancelAnimationFrame(this.frame);
        this.frame = requestAnimationFrame(() => this.update());
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      this.cleanup.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
      this.update();

      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (finePointer && !reduced) {
        const glow = this.glow.nativeElement;
        const onMove = (e: PointerEvent) => {
          glow.style.opacity = '1';
          glow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        };
        const onLeave = () => (glow.style.opacity = '0');
        window.addEventListener('pointermove', onMove, { passive: true });
        document.addEventListener('pointerleave', onLeave);
        this.cleanup.push(() => {
          window.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerleave', onLeave);
        });
      }
    });
  }

  private update() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    this.bar.nativeElement.style.transform = `scaleX(${progress})`;
    const show = window.scrollY > 600;
    if (show !== this.showTop()) this.zone.run(() => this.showTop.set(show));
  }

  toTop() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
    this.cleanup.forEach(fn => fn());
  }
}
