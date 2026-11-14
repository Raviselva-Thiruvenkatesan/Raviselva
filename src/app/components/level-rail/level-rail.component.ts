import { AfterViewInit, Component, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Home-page section navigator drawn like the level markers on a building elevation:
 * one datum per section, the current "floor" highlighted. Wide screens only.
 */
@Component({
  selector: 'app-level-rail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="rail" aria-label="Page sections">
      <ol>
        @for (level of levels; track level.id; let i = $index) {
          <li>
            <a routerLink="/" [fragment]="level.id" [class.active]="active() === level.id"
              [attr.aria-current]="active() === level.id ? 'location' : null">
              <span class="code mono" aria-hidden="true">L{{ i }}</span>
              <span class="datum" aria-hidden="true"></span>
              <span class="label">{{ level.label }}</span>
            </a>
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    .rail {
      position: fixed;
      left: 14px;
      top: 50%;
      z-index: 900;
      transform: translateY(-50%);
      display: none;
    }

    /* Only where the page margin is wide enough to hold it clear of the content column */
    @media (min-width: 1280px) and (max-width: 1399.98px), (min-width: 1440px) {
      .rail { display: block; }
    }

    ol {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 0;
      padding: 10px 0;
      list-style: none;
    }

    /* The vertical datum line the level markers hang off */
    ol::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 25px;
      width: 1px;
      background: linear-gradient(180deg, transparent, var(--border-strong) 12%, var(--border-strong) 88%, transparent);
    }

    a {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
      height: 30px;
      color: var(--text-muted);
      transition: color 0.25s ease;
    }

    .code {
      width: 18px;
      font-size: 0.62rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-align: right;
      opacity: 0.7;
      transition: opacity 0.25s ease;
    }

    /* Level marker: a short tick that grows on the active floor, with the elevation triangle */
    .datum {
      position: relative;
      width: 7px;
      height: 1.5px;
      margin-left: 2px;
      border-radius: 2px;
      background: currentColor;
      opacity: 0.7;
      transition: width 0.4s var(--ease-out), opacity 0.25s ease, background 0.25s ease;
    }

    .datum::after {
      content: '';
      position: absolute;
      right: -1px;
      bottom: 1.5px;
      border: 4px solid transparent;
      border-top: 6px solid currentColor;
      border-bottom: 0;
      opacity: 0;
      transform: translateY(-3px);
      transition: opacity 0.25s ease, transform 0.4s var(--ease-out);
    }

    .label {
      padding: 3px 10px;
      border-radius: 8px;
      font-size: 0.74rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      color: var(--text-main);
      background: var(--bg-glass);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-md);
      opacity: 0;
      transform: translateX(-6px);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.35s var(--ease-out);
    }

    a:hover, a:focus-visible, a.active { color: var(--purple); }
    a:hover .code, a:focus-visible .code, a.active .code { opacity: 1; }
    a:hover .datum, a:focus-visible .datum { width: 12px; opacity: 1; }
    a.active .datum { width: 16px; opacity: 1; background: var(--gradient-accent); }
    a.active .datum::after { opacity: 1; transform: none; }
    a:hover .label, a:focus-visible .label { opacity: 1; transform: none; }
  `]
})
export class LevelRailComponent implements AfterViewInit, OnDestroy {
  /** Top to bottom, in page order. */
  levels = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'notes', label: 'Notes' },
    { id: 'contact', label: 'Contact' }
  ];

  active = signal('home');

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;

  ngAfterViewInit() {
    if (!this.isBrowser || !('IntersectionObserver' in window)) return;
    // Same band as the navbar: a section is "current" once it crosses the upper-middle of the screen.
    this.observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length) this.active.set(visible[0].target.id);
    }, { rootMargin: '-45% 0px -50% 0px' });

    for (const level of this.levels) {
      const el = document.getElementById(level.id);
      if (el) this.observer.observe(el);
    }
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
