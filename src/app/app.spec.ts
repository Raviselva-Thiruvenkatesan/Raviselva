import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { TRACKS, allTopics, readyTopics } from './learn/catalog';
import { findLesson, lessonSlugs } from './learn/lessons';

describe('AppComponent', () => {
  beforeAll(() => {
    // jsdom has no matchMedia; browsers always do.
    window.matchMedia ??= ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false
    })) as typeof window.matchMedia;
  });

  it('creates the app shell', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('Learn catalog', () => {
  it('has a written lesson for every topic marked ready', () => {
    for (const t of TRACKS) {
      for (const topic of readyTopics(t)) {
        expect(findLesson(t.slug, topic.slug), `${t.slug}/${topic.slug}`).toBeDefined();
      }
    }
  });

  it('has no written lesson missing from the syllabus', () => {
    for (const t of TRACKS) {
      const syllabus = new Set(allTopics(t).map(x => x.slug));
      for (const slug of lessonSlugs(t.slug)) {
        expect(syllabus.has(slug), `${t.slug}/${slug}`).toBe(true);
      }
    }
  });

  it('uses unique topic slugs within each track', () => {
    for (const t of TRACKS) {
      const slugs = allTopics(t).map(x => x.slug);
      expect(new Set(slugs).size, t.slug).toBe(slugs.length);
    }
  });

  it('marks the whole C# course as written', () => {
    const cs = TRACKS.find(t => t.slug === 'csharp')!;
    expect(readyTopics(cs).length).toBe(allTopics(cs).length);
    expect(allTopics(cs).length).toBe(60);
  });
});
