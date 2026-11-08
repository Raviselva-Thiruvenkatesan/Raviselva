import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const SITE = 'Raviselva Thiruvenkatesan';

/** Sets the page title and description (and their link-preview equivalents) per route. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);

  set(pageTitle: string, description: string, type: 'website' | 'article' | 'profile' = 'website') {
    const full = pageTitle === SITE ? `${SITE} | .NET & Angular Developer` : `${pageTitle} | ${SITE}`;
    this.title.setTitle(full);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: full });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ name: 'twitter:title', content: full });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  }
}
