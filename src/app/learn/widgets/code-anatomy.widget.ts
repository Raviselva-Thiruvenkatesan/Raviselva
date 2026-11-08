import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { RichTextComponent } from '../shared/rich-text.component';

interface Part { id: string; label: string; from: number; to: number; focus: number; text: string }

/** Click each part of a Hello World program to learn what it does. */
@Component({
  selector: 'w-code-anatomy',
  standalone: true,
  imports: [CodeViewComponent, RichTextComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Anatomy of a C# program</h3></div>
      <p class="w-hint">Click a line of code (or a button below) to see what that part means.</p>

      <div class="w-controls" role="group" aria-label="Program parts">
        @for (p of parts; track p.id) {
          <button type="button" class="w-btn mono" [class.on]="p.id === sel().id" (click)="sel.set(p)"
            [attr.aria-pressed]="p.id === sel().id">{{ p.label }}</button>
        }
      </div>

      <div class="w-grid two">
        <app-code [code]="code" title="Program.cs" [compact]="true" [clickable]="true" [copyable]="false"
          [active]="[sel().focus]" [marked]="range()" (lineClick)="pick($event)" />
        <div class="w-panel" aria-live="polite">
          <div class="w-label">{{ sel().label }}</div>
          <app-rt [text]="sel().text" />
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss']
})
export class CodeAnatomyWidget {
  code = [
    'using System;',
    '',
    'namespace HelloApp',
    '{',
    '    class Program',
    '    {',
    '        static void Main(string[] args)',
    '        {',
    '            // Print a message to the console',
    '            Console.WriteLine("Hello, World!");',
    '        }',
    '    }',
    '}'
  ].join('\n');

  parts: Part[] = [
    { id: 'using', label: 'using System;', from: 1, to: 1, focus: 1,
      text: '`using` brings in a **namespace** so you can use its classes by their short name. `System` contains basic things like `Console`. Without this line you would have to write `System.Console.WriteLine(...)`.' },
    { id: 'namespace', label: 'namespace', from: 3, to: 13, focus: 3,
      text: 'A **namespace** is like a folder for your code. It groups related classes and avoids name clashes: your `Program` class is really `HelloApp.Program`. Everything between its `{ }` belongs to it.' },
    { id: 'class', label: 'class Program', from: 5, to: 12, focus: 5,
      text: 'In C#, all code lives inside a **class**. A class is a container for data and methods. Here the class is called `Program`, but the name could be anything.' },
    { id: 'main', label: 'static void Main', from: 7, to: 11, focus: 7,
      text: '`Main` is the **entry point**: the first method that runs when your program starts. `static` means it runs without creating an object, `void` means it returns nothing, and `string[] args` receives any command-line arguments.' },
    { id: 'comment', label: '// comment', from: 9, to: 9, focus: 9,
      text: 'Lines starting with `//` are **comments**. The compiler ignores them; they are notes for humans who read the code.' },
    { id: 'writeline', label: 'Console.WriteLine', from: 10, to: 10, focus: 10,
      text: '`Console.WriteLine` prints text to the console and moves to a new line. Text in double quotes is a **string**. Every statement ends with a **semicolon** `;`, which works like a full stop in a sentence.' },
    { id: 'braces', label: '{ }', from: 4, to: 13, focus: 4,
      text: 'Curly braces `{ }` mark a **block**: the start and end of a namespace, class or method. Every `{` must have a matching `}`. Indenting the code inside each block makes the structure easy to see.' }
  ];

  sel = signal<Part>(this.parts[3]);
  range = computed(() => {
    const p = this.sel();
    return Array.from({ length: p.to - p.from + 1 }, (_, i) => p.from + i);
  });

  pick(line: number) {
    const byLine: Record<number, string> = {
      1: 'using', 3: 'namespace', 4: 'braces', 13: 'braces', 5: 'class', 6: 'class', 12: 'class',
      7: 'main', 8: 'main', 11: 'main', 9: 'comment', 10: 'writeline'
    };
    const id = byLine[line];
    const p = this.parts.find(x => x.id === id);
    if (p) this.sel.set(p);
  }
}
