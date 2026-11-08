import { Directive, ElementRef, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input('appScrollReveal') animationClass: string = 'reveal-up';

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;

  ngOnInit() {
    // Added on the server too, so pre-rendered HTML matches the first browser frame (no flash).
    if (this.animationClass) this.el.classList.add(this.animationClass);
    if (!this.isBrowser) return;

    if (!('IntersectionObserver' in window)) {
      this.el.classList.add('in-view');
      return;
    }
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.el.classList.add('in-view');
          this.observer?.unobserve(this.el);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    this.observer.observe(this.el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
