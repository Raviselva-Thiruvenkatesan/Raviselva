import { RenderMode, ServerRoute } from '@angular/ssr';
import { POSTS } from './blog/posts';

/**
 * Every page is pre-rendered to static HTML at build time (no server needed to host the site).
 * Blog articles are listed from POSTS, so a new post is pre-rendered automatically.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => POSTS.map(p => ({ slug: p.slug }))
  },
  { path: '**', renderMode: RenderMode.Prerender }
];
