import { Injectable, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const KEY = 'learn-progress-v1';

/** Remembers which lessons the visitor has completed, in this browser only (localStorage). */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly done = signal<ReadonlySet<string>>(new Set());

  constructor() {
    // Read after the first render, so the pre-rendered HTML hydrates cleanly before progress appears.
    afterNextRender(() => this.load());
  }

  private load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      if (Array.isArray(saved)) this.done.set(new Set(saved.filter(x => typeof x === 'string')));
    } catch { /* storage blocked or corrupt: start fresh */ }
  }

  isDone(track: string, slug: string): boolean {
    return this.done().has(`${track}/${slug}`);
  }

  count(track: string): number {
    let n = 0;
    for (const k of this.done()) if (k.startsWith(track + '/')) n++;
    return n;
  }

  set(track: string, slug: string, value: boolean) {
    const next = new Set(this.done());
    if (value) next.add(`${track}/${slug}`);
    else next.delete(`${track}/${slug}`);
    this.done.set(next);
    if (!this.isBrowser) return;
    try { localStorage.setItem(KEY, JSON.stringify([...next])); } catch { /* ignore */ }
  }
}
