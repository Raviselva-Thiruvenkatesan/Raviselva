import { Component, input } from '@angular/core';
import { RichPipe } from './rich.pipe';

/** Inline lesson text with `code` and **bold** marks. */
@Component({
  selector: 'app-rt',
  standalone: true,
  imports: [RichPipe],
  template: `@for (s of text() | rich; track $index) {@switch (s.k) {@case ('c') {<code class="ic">{{ s.v }}</code>}@case ('b') {<strong>{{ s.v }}</strong>}@default {<ng-container>{{ s.v }}</ng-container>}}}`,
  styles: [`
    :host { display: inline; }
    .ic {
      font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
      font-size: 0.88em;
      padding: 0.1em 0.4em;
      border-radius: 6px;
      color: var(--purple);
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid rgba(139, 92, 246, 0.18);
      overflow-wrap: anywhere;
      font-variant-ligatures: none;
    }
  `]
})
export class RichTextComponent {
  text = input.required<string>();
}
