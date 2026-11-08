import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDarkMode = signal<boolean>(false);

  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    // Pre-rendering has no saved preference; the inline script in index.html applies the
    // visitor's theme before first paint, and this service takes over once the app starts.
    if (!this.isBrowser) return;

    let savedTheme: string | null = null;
    try {
      savedTheme = localStorage.getItem('theme');
    } catch { /* storage blocked */ }

    // First visit: follow the device's light/dark setting.
    this.isDarkMode.set(
      savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    effect(() => {
      const theme = this.isDarkMode() ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', this.isDarkMode() ? '#020617' : '#f8fafc');
    });
  }

  toggleTheme() {
    this.isDarkMode.update(val => !val);
    try {
      localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light');
    } catch { /* storage blocked */ }
  }
}
