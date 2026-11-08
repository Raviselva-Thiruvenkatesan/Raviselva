import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  // Blog pages are lazy-loaded so they add nothing to the home page's download.
  { path: 'blog', loadComponent: () => import('./blog/blog-list.component').then(m => m.BlogListComponent) },
  { path: 'blog/:slug', loadComponent: () => import('./blog/blog-post.component').then(m => m.BlogPostComponent) },
  // Learn section: lazy-loaded the same way.
  { path: 'learn', loadComponent: () => import('./learn/learn-home.component').then(m => m.LearnHomeComponent) },
  { path: 'learn/:track', loadComponent: () => import('./learn/track.component').then(m => m.TrackComponent) },
  { path: 'learn/:track/:slug', loadComponent: () => import('./learn/lesson.component').then(m => m.LessonComponent) },
  { path: '**', redirectTo: '' }
];
