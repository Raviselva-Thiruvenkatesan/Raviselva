import { Component, computed, effect, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { POSTS, findPost, readingMinutes } from './posts';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <section class="blog-page">
      <div class="container article-wrap">
        <a routerLink="/blog" class="back-link"><i class="bi bi-arrow-left" aria-hidden="true"></i> All articles</a>

        @if (post(); as p) {
          <article>
            <header class="mb-4">
              <p class="post-meta">
                <time [attr.datetime]="p.date">{{ p.date | date: 'd MMMM y' }}</time>
                · {{ minutes() }} min read · Raviselva Thiruvenkatesan
              </p>
              <h1 class="article-title fw-bold">{{ p.title }}</h1>
              <ul class="tags" aria-label="Tags">
                @for (tag of p.tags; track tag) { <li>{{ tag }}</li> }
              </ul>
            </header>

            <div class="article-body">
              @for (block of p.blocks; track $index) {
                @switch (block.type) {
                  @case ('h2') { <h2>{{ block.text }}</h2> }
                  @case ('p') { <p>{{ block.text }}</p> }
                  @case ('ul') { <ul>@for (item of block.items; track $index) { <li>{{ item }}</li> }</ul> }
                  @case ('code') { <pre [attr.data-lang]="block.lang"><code>{{ block.code }}</code></pre> }
                  @case ('note') {
                    <aside class="note"><i class="bi bi-lightbulb" aria-hidden="true"></i><p>{{ block.text }}</p></aside>
                  }
                }
              }
            </div>
          </article>

          @if (next(); as n) {
            <nav class="next-post glass-card" aria-label="Next article">
              <span class="post-meta">Read next</span>
              <a [routerLink]="['/blog', n.slug]" class="fw-bold">{{ n.title }}</a>
            </nav>
          }
        } @else {
          <h1 class="article-title fw-bold">Article not found</h1>
          <p class="text-muted">It may have moved. <a routerLink="/blog">See all articles</a>.</p>
        }
      </div>
    </section>
  `,
  styleUrls: ['./blog.styles.scss']
})
export class BlogPostComponent {
  /** Bound from the :slug route parameter (withComponentInputBinding). */
  slug = input<string>('');

  post = computed(() => findPost(this.slug()));
  minutes = computed(() => (this.post() ? readingMinutes(this.post()!) : 0));
  next = computed(() => {
    const i = POSTS.findIndex(p => p.slug === this.slug());
    return i < 0 ? undefined : POSTS[(i + 1) % POSTS.length];
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const p = this.post();
      if (p) seo.set(p.title, p.summary, 'article');
      else seo.set('Article not found', 'This article could not be found.');
    });
  }
}
