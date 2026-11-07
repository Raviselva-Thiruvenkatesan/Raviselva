import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDarkMode = signal<boolean>(false);

  constructor() {
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
