import { RenderMode, ServerRoute } from '@angular/ssr';
import { POSTS } from './blog/posts';
import { TRACKS, readyTopics } from './learn/catalog';
import { lessonSlugs } from './learn/lessons';

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
  {
    path: 'learn/:track',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => TRACKS.map(t => ({ track: t.slug }))
  },
  {
    path: 'learn/:track/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => TRACKS.flatMap(t => {
      const written = new Set(lessonSlugs(t.slug));
      return readyTopics(t).map(topic => {
        if (!written.has(topic.slug)) throw new Error(`Topic ${t.slug}/${topic.slug} is marked ready but has no lesson.`);
        return { track: t.slug, slug: topic.slug };
      });
    })
  },
  { path: '**', renderMode: RenderMode.Prerender }
];
