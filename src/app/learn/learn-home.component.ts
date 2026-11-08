import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TRACKS, allTopics, readyTopics } from './catalog';
import { Track } from './learn.types';
import { ProgressService } from './shared/progress.service';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-learn-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="learn-page" aria-labelledby="learn-title">
      <div class="container">
        <header class="text-center mb-5">
          <h1 id="learn-title" class="display-5 fw-bold mb-3">Learn <span class="text-gradient">basic to master</span></h1>
          <p class="text-muted mx-auto lead-sm">
            Free, step-by-step courses written for freshers. Every topic in order, nothing skipped, with interactive
            diagrams that show what the code really does. Your progress is saved in this browser.
          </p>
        </header>

        <div class="row g-4">
          @for (t of tracks; track t.slug) {
            <div class="col-lg-4 col-md-6">
              @if (t.live) {
                <a class="track-card glass-card h-100 d-flex flex-column" [routerLink]="['/learn', t.slug]">
                  <div class="d-flex justify-content-between align-items-start">
                    <div class="track-icon" aria-hidden="true"><i class="bi {{ t.icon }}"></i></div>
                    <span class="pill live">Available</span>
                  </div>
                  <h2 class="h5 fw-bold">{{ t.title }}</h2>
                  <p class="text-muted flex-grow-1">{{ t.description }}</p>
                  <p class="small text-muted mb-2">{{ ready(t) }} lessons ready · {{ total(t) }} topics planned</p>
                  <div class="progress-line" role="progressbar" [attr.aria-valuenow]="progress.count(t.slug)" aria-valuemin="0" [attr.aria-valuemax]="ready(t)" [attr.aria-label]="t.short + ' progress'">
                    <span [style.width.%]="pct(t)"></span>
                  </div>
                  <p class="small mt-2 mb-0">{{ progress.count(t.slug) }} of {{ ready(t) }} completed</p>
                </a>
              } @else {
                <div class="track-card soon glass-card h-100 d-flex flex-column">
                  <div class="d-flex justify-content-between align-items-start">
                    <div class="track-icon" aria-hidden="true"><i class="bi {{ t.icon }}"></i></div>
                    <span class="pill">Coming soon</span>
                  </div>
                  <h2 class="h5 fw-bold">{{ t.title }}</h2>
                  <p class="text-muted mb-0">{{ t.description }}</p>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./learn.styles.scss']
})
export class LearnHomeComponent {
  tracks = TRACKS;
  progress = inject(ProgressService);

  constructor() {
    inject(SeoService).set(
      'Learn C#, DSA and BIM Math',
      'Free step-by-step courses from basic to master level with interactive diagrams: C#, data structures and algorithms, BIM math and more.'
    );
  }

  ready(t: Track) { return readyTopics(t).length; }
  total(t: Track) { return allTopics(t).length; }
  pct(t: Track) { return this.ready(t) ? (100 * this.progress.count(t.slug)) / this.ready(t) : 0; }
}
