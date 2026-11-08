import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { HeroComponent } from '../components/hero/hero.component';
import { AboutComponent } from '../components/about/about.component';
import { SkillsComponent } from '../components/skills/skills.component';
import { ExperienceComponent } from '../components/experience/experience.component';
import { ProjectsComponent } from '../components/projects/projects.component';
import { AchievementsComponent } from '../components/achievements/achievements.component';
import { ContactComponent } from '../components/contact/contact.component';
import { ScrollRevealDirective } from '../directives/scroll-reveal.directive';
import { POSTS, readingMinutes } from '../blog/posts';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent, AboutComponent, SkillsComponent, ExperienceComponent, ProjectsComponent,
    AchievementsComponent, ContactComponent, ScrollRevealDirective, RouterLink, DatePipe
  ],
  template: `
    <!-- Animated background blobs -->
    <div class="bg-blob" aria-hidden="true" style="top: 10%; left: 5%; width: 300px; height: 300px; background: var(--purple);"></div>
    <div class="bg-blob" aria-hidden="true"
      style="top: 40%; right: 5%; width: 400px; height: 400px; background: var(--indigo); animation-delay: 2s;"></div>
    <div class="bg-blob" aria-hidden="true"
      style="top: 70%; left: 20%; width: 350px; height: 350px; background: var(--blue-neon); animation-delay: 4s;"></div>

    <app-hero id="home"></app-hero>
    <app-about id="about"></app-about>
    <app-skills id="skills"></app-skills>
    <app-experience id="experience"></app-experience>
    <app-projects id="projects"></app-projects>
    <app-achievements id="achievements"></app-achievements>

    <section id="notes" class="py-5" aria-labelledby="notes-title">
      <div class="container">
        <div class="text-center mb-5" appScrollReveal="reveal-up">
          <h2 id="notes-title" class="display-5 fw-bold mb-3">Latest <span class="text-gradient">Notes</span></h2>
          <div class="divider mx-auto"></div>
        </div>
        <div class="row g-4">
          @for (post of latest; track post.slug) {
            <div class="col-lg-4 col-md-6" appScrollReveal="reveal-up">
              <a class="post-card glass-card h-100 d-flex flex-column" [routerLink]="['/blog', post.slug]">
                <div class="post-icon" aria-hidden="true"><i class="bi {{ post.icon }}"></i></div>
                <p class="post-meta">{{ post.date | date: 'd MMM y' }} · {{ minutes(post) }} min read</p>
                <h3 class="h5 fw-bold">{{ post.title }}</h3>
                <p class="text-muted flex-grow-1 mb-0">{{ post.summary }}</p>
              </a>
            </div>
          }
        </div>
        <div class="text-center mt-5">
          <a routerLink="/blog" class="btn-magnetic btn-outline-custom">
            All articles <i class="bi bi-arrow-right ms-2" aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </section>

    <app-contact id="contact"></app-contact>
  `,
  styleUrls: ['../blog/blog.styles.scss'],
  styles: [`
    .divider { width: 60px; height: 4px; background: var(--gradient-primary); border-radius: 2px; }
  `]
})
export class HomeComponent {
  latest = POSTS.slice(0, 3);
  minutes = readingMinutes;

  constructor() {
    inject(SeoService).set(
      'Raviselva Thiruvenkatesan',
      'Raviselva Thiruvenkatesan – .NET developer from Salem, Tamil Nadu working on the Viskar BIM suite ' +
      '(ViskarSteel Light, ViskarBIM), a VTK-based 3D render engine and software performance, with C#, WPF, Angular and SQL Server.',
      'profile'
    );
  }
}
