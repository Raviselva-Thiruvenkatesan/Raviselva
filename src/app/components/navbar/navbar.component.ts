import { AfterViewInit, Component, HostListener, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  isScrolled = false;
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

  constructor(public themeService: ThemeService) {}

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

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrolled = window.scrollY > 50;
    if (scrolled !== this.isScrolled) this.isScrolled = scrolled;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
  }

  closeMenu() {
    if (!this.isMenuOpen) return;
    this.isMenuOpen = false;
    document.body.style.overflow = '';
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
