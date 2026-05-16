import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  stats = [
    { value: '1+', label: 'Years Experience', icon: 'bi-briefcase' },
    { value: '5+', label: 'Projects Completed', icon: 'bi-check-circle' },
    { value: '10+', label: 'Technologies', icon: 'bi-code-slash' },
    { value: '100%', label: 'Problem Solving', icon: 'bi-lightbulb' }
  ];
}
