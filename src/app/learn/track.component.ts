import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { allTopics, findTrack, readyTopics } from './catalog';
import { ProgressService } from './shared/progress.service';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="learn-page">
      <div class="container" style="max-width: 920px">
        <ol class="crumbs" aria-label="Breadcrumb">
          <li><a routerLink="/learn">Learn</a></li>
          <li aria-current="page">{{ t()?.short ?? 'Not found' }}</li>
        </ol>

        @if (t(); as t) {
          <header class="track-hero glass-card">
            <div class="d-flex gap-3 align-items-start flex-wrap">
              <div class="track-icon mb-0" aria-hidden="true"><i class="bi {{ t.icon }}"></i></div>
              <div class="flex-grow-1" style="min-width: 220px">
                <h1 class="fw-bold mb-2" style="font-size: clamp(1.7rem, 4vw, 2.3rem)">{{ t.title }}</h1>
                <p class="text-muted mb-3">{{ t.description }}</p>
              </div>
            </div>
            @if (t.live) {
              <div class="progress-line mb-2" role="progressbar" [attr.aria-valuenow]="done()" aria-valuemin="0" [attr.aria-valuemax]="ready().length" aria-label="Course progress">
                <span [style.width.%]="ready().length ? (100 * done()) / ready().length : 0"></span>
              </div>
              <div class="d-flex flex-wrap gap-3 align-items-center justify-content-between">
                <span class="small text-muted">{{ done() }} of {{ ready().length }} lessons completed · {{ total() }} topics in the full course</span>
                @if (next(); as n) {
                  <a class="btn-magnetic btn-primary-custom" [routerLink]="['/learn', t.slug, n.slug]">
                    {{ done() ? 'Continue' : 'Start learning' }}: {{ n.title }} <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
                  </a>
                } @else {
                  <span class="pill live">All available lessons completed. New ones are added regularly.</span>
                }
              </div>
            } @else {
              <span class="pill">Coming soon</span>
            }
          </header>

          @for (m of t.modules; track m.title; let mi = $index) {
            <section class="module glass-card" [attr.aria-labelledby]="'m' + mi">
              <div class="module-head">
                <span class="level {{ m.level }}">{{ m.level }}</span>
                <h2 [id]="'m' + mi">{{ mi + 1 }}. {{ m.title }}</h2>
                <span class="count">{{ m.topics.length }} topics</span>
              </div>
              <ul class="topics">
                @for (topic of m.topics; track topic.slug) {
                  <li>
                    @if (topic.ready) {
                      <a class="topic ready" [class.done]="progress.isDone(t.slug, topic.slug)" [routerLink]="['/learn', t.slug, topic.slug]">
                        <span class="n" aria-hidden="true">
                          @if (progress.isDone(t.slug, topic.slug)) { <i class="bi bi-check-lg"></i> } @else { {{ number(topic.slug) }} }
                        </span>
                        <span class="t">{{ topic.title }}</span>
                        <span class="tag">{{ progress.isDone(t.slug, topic.slug) ? 'Completed' : 'Lesson' }}</span>
                      </a>
                    } @else {
                      <div class="topic locked">
                        <span class="n" aria-hidden="true">{{ number(topic.slug) }}</span>
                        <span class="t">{{ topic.title }}</span>
                        <span class="tag"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Coming soon</span>
                      </div>
                    }
                  </li>
                }
              </ul>
            </section>
          }
        } @else {
          <h1 class="fw-bold">Course not found</h1>
          <p class="text-muted"><a routerLink="/learn">See all courses</a>.</p>
        }
      </div>
    </section>
  `,
  styleUrls: ['./learn.styles.scss']
})
export class TrackComponent {
  /** Bound from the :track route parameter. */
  track = input<string>('');
  progress = inject(ProgressService);

  t = computed(() => findTrack(this.track()));
  ready = computed(() => (this.t() ? readyTopics(this.t()!) : []));
  total = computed(() => (this.t() ? allTopics(this.t()!).length : 0));
  done = computed(() => this.ready().filter(x => this.progress.isDone(this.track(), x.slug)).length);
  next = computed(() => this.ready().find(x => !this.progress.isDone(this.track(), x.slug)));
  private order = computed(() => new Map((this.t() ? allTopics(this.t()!) : []).map((x, i) => [x.slug, i + 1])));

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const t = this.t();
      if (t) seo.set(`Learn ${t.title}`, t.description);
      else seo.set('Course not found', 'This course could not be found.');
    });
  }

  number(slug: string) {
    return this.order().get(slug);
  }
}
