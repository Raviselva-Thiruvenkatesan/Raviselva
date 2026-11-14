import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MotionService } from '../../services/motion.service';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { HeroSceneComponent } from '../hero-scene/hero-scene.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective, HeroSceneComponent],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent implements OnInit, OnDestroy {
  roles = ['Software Engineer', '.NET Developer', 'BIM Software Developer', '3D & Performance Engineer'];

  /**
   * Put your CV in the `public/` folder (e.g. public/Raviselva_Resume.pdf) and set the
   * file name here. The "Download Resume" button only shows when this is set.
   */
  resumeUrl = 'Raviselva_T_Resume.pdf';

  // A signal so the view updates from setTimeout (this app runs without Zone.js).
  currentRole = signal('');
  roleIndex = 0;
  charIndex = 0;
  isDeleting = false;

  /** Interactive 3D model takes over the hero while true. */
  exploring = signal(false);
  @ViewChild('exploreBtn') exploreBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('coords', { static: true }) coords!: ElementRef<HTMLElement>;

  private timer?: ReturnType<typeof setTimeout>;
  private motion = inject(MotionService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private frame = 0;

  /**
   * CAD status bar: writes the pointer position (in "mm", 10 per pixel, origin bottom-left as in
   * a model view) straight to the DOM, so moving the mouse never triggers change detection.
   */
  private readonly onPointer = (e: PointerEvent) => {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const rect = this.host.getBoundingClientRect();
      const bar = this.coords.nativeElement;
      const set = (axis: string, px: number) => {
        const el = bar.querySelector(`[data-axis="${axis}"]`);
        if (el) el.textContent = String(Math.max(0, Math.round(px) * 10)).padStart(4, '0');
      };
      set('x', e.clientX - rect.left);
      set('y', rect.bottom - e.clientY);
    });
  };

  ngOnInit() {
    if (this.isBrowser) this.host.addEventListener('pointermove', this.onPointer, { passive: true });
    // Pre-rendered HTML (and reduced-motion visitors) show the first role without typing.
    if (!this.isBrowser || this.motion.reducedMotion()) {
      this.currentRole.set(this.roles[0]);
      return;
    }
    this.typeEffect();
  }

  typeEffect() {
    const current = this.roles[this.roleIndex];

    if (this.isDeleting) {
      this.currentRole.set(current.substring(0, this.charIndex - 1));
      this.charIndex--;
    } else {
      this.currentRole.set(current.substring(0, this.charIndex + 1));
      this.charIndex++;
    }

    let typeSpeed = this.isDeleting ? 50 : 100;

    if (!this.isDeleting && this.charIndex === current.length) {
      typeSpeed = 2000;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.roleIndex = (this.roleIndex + 1) % this.roles.length;
      typeSpeed = 500;
    }

    this.timer = setTimeout(() => this.typeEffect(), typeSpeed);
  }

  openExplore() {
    this.exploring.set(true);
    this.lockScroll(true);
  }

  closeExplore() {
    this.exploring.set(false);
    this.lockScroll(false);
    // Return keyboard focus to the button that opened the model, once Angular has removed `inert`.
    const btn = this.exploreBtn?.nativeElement;
    if (!btn) return;
    const focus = () => btn.focus({ preventScroll: true });
    if (!btn.hasAttribute('inert')) {
      focus();
      return;
    }
    const mo = new MutationObserver(() => {
      if (btn.hasAttribute('inert')) return;
      mo.disconnect();
      focus();
    });
    mo.observe(btn, { attributes: true, attributeFilter: ['inert'] });
    setTimeout(() => mo.disconnect(), 3000);   // safety net
  }

  /** The viewer is full-screen: keep the page behind it from scrolling. */
  private lockScroll(lock: boolean) {
    if (!this.isBrowser) return;
    document.documentElement.style.overflow = lock ? 'hidden' : '';
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
    if (this.isBrowser) {
      cancelAnimationFrame(this.frame);
      this.host.removeEventListener('pointermove', this.onPointer);
    }
    if (this.exploring()) this.lockScroll(false);
  }
}
