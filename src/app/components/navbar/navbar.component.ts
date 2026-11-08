import { AfterViewInit, Component, DestroyRef, HostListener, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  isScrolled = signal(false);
  isMenuOpen = false;
  /** Section id in view on the home page, or 'blog' / 'learn' on those pages. */
  activeSection = signal('home');

  /** Home-page sections (linked as /#id so they work from any page). */
  links = [
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'contact', label: 'Contact' }
  ];

  themeService = inject(ThemeService);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyRef = inject(DestroyRef);
  private observer?: IntersectionObserver;

  // Passive DOM listener + signal: only re-renders when the 50px threshold is crossed,
  // instead of running change detection on every scroll event.
  private readonly onScroll = () => this.isScrolled.set(window.scrollY > 50);

  ngOnInit() {
    if (!this.isBrowser) return;
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    this.observeSections();
    // Sections only exist on the home page: re-observe after every navigation.
    const sub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.closeMenu();
      setTimeout(() => this.observeSections());
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private observeSections() {
    this.observer?.disconnect();
    if (this.router.url.startsWith('/blog')) {
      this.activeSection.set('blog');
      return;
    }
    if (this.router.url.startsWith('/learn')) {
      this.activeSection.set('learn');
      return;
    }
    this.activeSection.set('home');
    if (!('IntersectionObserver' in window)) return;
    // A section counts as "active" when it crosses a band around the upper-middle of the viewport.
    this.observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (!visible.length) return;
      this.activeSection.set(visible[0].target.id);
    }, { rootMargin: '-45% 0px -50% 0px' });

    ['home', ...this.links.map(l => l.id), 'notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) this.observer!.observe(el);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.lockScroll(this.isMenuOpen);
  }

  closeMenu() {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    this.lockScroll(false);
  }

  /**
   * The page scrolls on <html> (it has overflow-x: clip, so <body>'s overflow no longer
   * propagates to the viewport) — lock both so the page behind the menu can't move.
   */
  private lockScroll(lock: boolean) {
    if (!this.isBrowser) return;
    const value = lock ? 'hidden' : '';
    document.documentElement.style.overflow = value;
    document.body.style.overflow = value;
  }

  ngOnDestroy() {
    if (!this.isBrowser) return;
    window.removeEventListener('scroll', this.onScroll);
    this.observer?.disconnect();
    this.lockScroll(false);
  }
}
