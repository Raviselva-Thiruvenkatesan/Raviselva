import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { findTrack, readyTopics } from './catalog';
import { findLesson } from './lessons';
import { LessonBlocksComponent } from './shared/lesson-blocks.component';
import { RichTextComponent } from './shared/rich-text.component';
import { ProgressService } from './shared/progress.service';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-lesson',
  standalone: true,
  imports: [RouterLink, LessonBlocksComponent, RichTextComponent],
  template: `
    <section class="learn-page">
      <div class="container">
        @if (t(); as t) {
          <div class="lesson-layout">
            <nav class="side" aria-label="Course lessons">
              @for (m of t.modules; track m.title) {
                <div class="side-module">
                  <h3>{{ m.title }}</h3>
                  <ul>
                    @for (x of m.topics; track x.slug) {
                      <li>
                        @if (x.ready) {
                          <a [routerLink]="['/learn', t.slug, x.slug]" [class.current]="x.slug === slug()" [attr.aria-current]="x.slug === slug() ? 'page' : null">
                            <i class="bi" [class.bi-check-circle-fill]="progress.isDone(t.slug, x.slug)" [class.bi-circle]="!progress.isDone(t.slug, x.slug)" aria-hidden="true"></i>
                            {{ x.title }}</a>
                        } @else {
                          <span class="locked"><i class="bi bi-lock" aria-hidden="true"></i> {{ x.title }}</span>
                        }
                      </li>
                    }
                  </ul>
                </div>
              }
            </nav>

            <div class="lesson-main">
              <ol class="crumbs" aria-label="Breadcrumb">
                <li><a routerLink="/learn">Learn</a></li>
                <li><a [routerLink]="['/learn', t.slug]">{{ t.short }}</a></li>
                <li aria-current="page">{{ moduleTitle() }}</li>
              </ol>

              <details class="side-mobile glass-card">
                <summary>All lessons in this course</summary>
                @for (m of t.modules; track m.title) {
                  <div class="side-module mt-2">
                    <h3>{{ m.title }}</h3>
                    <ul>
                      @for (x of m.topics; track x.slug) {
                        @if (x.ready) {
                          <li><a [routerLink]="['/learn', t.slug, x.slug]" [class.current]="x.slug === slug()">
                            <i class="bi" [class.bi-check-circle-fill]="progress.isDone(t.slug, x.slug)" [class.bi-circle]="!progress.isDone(t.slug, x.slug)" aria-hidden="true"></i>
                            {{ x.title }}</a></li>
                        }
                      }
                    </ul>
                  </div>
                }
              </details>

              @if (lesson(); as l) {
                <article>
                  <header>
                    <p class="lesson-meta">
                      <span>Lesson {{ index() + 1 }} of {{ ready().length }}</span>
                      <span><i class="bi bi-clock" aria-hidden="true"></i> {{ l.minutes }} min</span>
                      <span class="level {{ level() }}">{{ level() }}</span>
                    </p>
                    <h1 class="lesson-title">{{ l.title }}</h1>
                    <p class="lesson-summary">{{ l.summary }}</p>
                  </header>

                  <app-lesson-blocks [blocks]="l.blocks" />

                  <section class="recap glass-card" aria-labelledby="recap-title">
                    <h2 id="recap-title"><i class="bi bi-bookmark-star me-2" aria-hidden="true"></i>Remember</h2>
                    <ul>
                      @for (k of l.keyPoints; track $index) {
                        <li><i class="bi bi-check2-circle" aria-hidden="true"></i><span><app-rt [text]="k" /></span></li>
                      }
                    </ul>
                  </section>
                </article>

                <div class="lesson-foot">
                  <button type="button" class="done-btn" [class.is-done]="isDone()" (click)="toggleDone()" [attr.aria-pressed]="isDone()">
                    <i class="bi" [class.bi-check-circle-fill]="isDone()" [class.bi-circle]="!isDone()" aria-hidden="true"></i>
                    {{ isDone() ? 'Completed' : 'Mark as complete' }}
                  </button>
                  <span class="small text-muted">{{ doneCount() }} of {{ ready().length }} lessons completed</span>
                </div>

                <nav class="pager" aria-label="Lesson navigation">
                  @if (prev(); as p) {
                    <a class="glass-card" [routerLink]="['/learn', t.slug, p.slug]"><small><i class="bi bi-arrow-left" aria-hidden="true"></i> Previous</small><strong>{{ p.title }}</strong></a>
                  }
                  @if (next(); as n) {
                    <a class="glass-card next" [routerLink]="['/learn', t.slug, n.slug]" (click)="markDone()"><small>Next lesson <i class="bi bi-arrow-right" aria-hidden="true"></i></small><strong>{{ n.title }}</strong></a>
                  } @else {
                    <a class="glass-card next" [routerLink]="['/learn', t.slug]" (click)="markDone()"><small>Finished the available lessons</small><strong>Back to the course</strong></a>
                  }
                </nav>
              } @else {
                <h1 class="lesson-title">Lesson not found</h1>
                <p class="text-muted">This lesson isn’t available yet. <a [routerLink]="['/learn', t.slug]">See the course syllabus</a>.</p>
              }
            </div>
          </div>
        } @else {
          <h1 class="lesson-title">Course not found</h1>
          <p class="text-muted"><a routerLink="/learn">See all courses</a>.</p>
        }
      </div>
    </section>
  `,
  styleUrls: ['./learn.styles.scss']
})
export class LessonComponent {
  /** Bound from the :track and :slug route parameters. */
  track = input<string>('');
  slug = input<string>('');
  progress = inject(ProgressService);

  t = computed(() => findTrack(this.track()));
  lesson = computed(() => findLesson(this.track(), this.slug()));
  ready = computed(() => (this.t() ? readyTopics(this.t()!) : []));
  index = computed(() => this.ready().findIndex(x => x.slug === this.slug()));
  prev = computed(() => (this.index() > 0 ? this.ready()[this.index() - 1] : undefined));
  next = computed(() => (this.index() >= 0 ? this.ready()[this.index() + 1] : undefined));
  module = computed(() => this.t()?.modules.find(m => m.topics.some(x => x.slug === this.slug())));
  moduleTitle = computed(() => this.module()?.title ?? '');
  level = computed(() => this.module()?.level ?? 'Beginner');
  isDone = computed(() => this.progress.isDone(this.track(), this.slug()));
  doneCount = computed(() => this.ready().filter(x => this.progress.isDone(this.track(), x.slug)).length);

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const l = this.lesson();
      const t = this.t();
      if (l && t) seo.set(`${l.title} | ${t.short} course`, l.summary, 'article');
      else seo.set('Lesson not found', 'This lesson could not be found.');
    });
  }

  toggleDone() {
    this.progress.set(this.track(), this.slug(), !this.isDone());
  }

  markDone() {
    this.progress.set(this.track(), this.slug(), true);
  }
}
