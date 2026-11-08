import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { POSTS, readingMinutes } from './posts';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <section class="blog-page" aria-labelledby="blog-title">
      <div class="container">
        <header class="text-center mb-5">
          <h1 id="blog-title" class="display-5 fw-bold mb-3">Notes &amp; <span class="text-gradient">Articles</span></h1>
          <p class="text-muted mx-auto lead-sm">
            Write-ups on 3D rendering, BIM software, Angular and the things I learn building them.
          </p>
        </header>

        <div class="row g-4">
          @for (post of posts; track post.slug) {
            <div class="col-lg-4 col-md-6">
              <a class="post-card glass-card h-100 d-flex flex-column" [routerLink]="['/blog', post.slug]">
                <div class="post-icon" aria-hidden="true"><i class="bi {{ post.icon }}"></i></div>
                <p class="post-meta">
                  <time [attr.datetime]="post.date">{{ post.date | date: 'd MMM y' }}</time>
                  · {{ minutes(post) }} min read
                </p>
                <h2 class="h5 fw-bold">{{ post.title }}</h2>
                <p class="text-muted flex-grow-1">{{ post.summary }}</p>
                <ul class="tags" aria-label="Tags">
                  @for (tag of post.tags; track tag) { <li>{{ tag }}</li> }
                </ul>
              </a>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./blog.styles.scss']
})
export class BlogListComponent {
  posts = POSTS;
  minutes = readingMinutes;

  constructor() {
    inject(SeoService).set(
      'Notes & Articles',
      'Articles by Raviselva Thiruvenkatesan on 3D rendering with Three.js, BIM software, Angular performance and web security.'
    );
  }
}
