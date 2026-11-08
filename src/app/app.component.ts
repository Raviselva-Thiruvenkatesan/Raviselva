import { Component, inject } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ScrollFxComponent } from './components/scroll-fx/scroll-fx.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ScrollFxComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor() {
    // Router anchor scrolling (/#projects) should clear the fixed navbar, like CSS scroll-padding-top.
    inject(ViewportScroller).setOffset([0, 80]);
  }

  /**
   * With <base href="/">, a plain "#main-content" link would navigate to "/#main-content"
   * from other pages (e.g. /blog). Move focus to the main landmark directly instead.
   */
  skipToContent(event: Event) {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main?.focus();
    main?.scrollIntoView();
  }
}
