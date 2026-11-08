import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  // Blog pages are lazy-loaded so they add nothing to the home page's download.
  { path: 'blog', loadComponent: () => import('./blog/blog-list.component').then(m => m.BlogListComponent) },
  { path: 'blog/:slug', loadComponent: () => import('./blog/blog-post.component').then(m => m.BlogPostComponent) },
  { path: '**', redirectTo: '' }
];
