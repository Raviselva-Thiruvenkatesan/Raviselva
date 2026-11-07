import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  isScrolled = signal(false);
  isMenuOpen = false;
  activeSection = signal('home');

  links = [
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'contact', label: 'Contact' }
  ];

  private observer?: IntersectionObserver;

  // Passive DOM listener + signal: only re-renders when the 50px threshold is crossed,
  // instead of running change detection on every scroll event.
  private readonly onScroll = () => this.isScrolled.set(window.scrollY > 50);

  constructor(public themeService: ThemeService) {}

  ngOnInit() {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.onScroll();
  }

  ngAfterViewInit() {
    if (!('IntersectionObserver' in window)) return;
    // A section counts as "active" when it crosses a band around the upper-middle of the viewport.
    this.observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (!visible.length) return;
      this.activeSection.set(visible[0].target.id);
    }, { rootMargin: '-45% 0px -50% 0px' });

    ['home', ...this.links.map(l => l.id)].forEach(id => {
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
    const value = lock ? 'hidden' : '';
    document.documentElement.style.overflow = value;
    document.body.style.overflow = value;
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.onScroll);
    this.observer?.disconnect();
    this.lockScroll(false);
  }
}
