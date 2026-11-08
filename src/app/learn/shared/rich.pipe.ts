import { Pipe, PipeTransform } from '@angular/core';

export interface Seg { k: 't' | 'c' | 'b'; v: string }

/**
 * Splits lesson text into plain / `code` / **bold** segments, rendered with bindings
 * (never innerHTML). Usage: @for (s of text | rich; track $index) { ... }
 */
@Pipe({ name: 'rich', standalone: true })
export class RichPipe implements PipeTransform {
  transform(text: string): Seg[] {
    const out: Seg[] = [];
    for (const part of text.split(/(`[^`]+`|\*\*[^*]+\*\*)/)) {
      if (!part) continue;
      if (part.startsWith('`')) out.push({ k: 'c', v: part.slice(1, -1) });
      else if (part.startsWith('**')) out.push({ k: 'b', v: part.slice(2, -2) });
      else out.push({ k: 't', v: part });
    }
    return out;
  }
}
