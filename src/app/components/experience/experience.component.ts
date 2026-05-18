import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './experience.component.html',
  styleUrls: ['./experience.component.scss']
})
export class ExperienceComponent {
  experiences = [
    {
      title: '.NET Developer',
      company: 'RGS Construction Technology Pvt Ltd',
      date: 'Nov 2024 - Present',
      description: 'Developing BIM and engineering desktop applications using C#, WPF, MVVM, XAML. Working on scalable software architecture, responsive UI design, and modern engineering solutions.',
      icon: 'bi-laptop'
    },
    {
      title: 'IT Intern',
      company: 'Vee Technologies Pvt Ltd',
      date: 'Feb 2024 - Apr 2024',
      description: 'Assisted in building internal tools and learned modern software architecture practices. Contributed to frontend and backend module development.',
      icon: 'bi-code-square'
    }
  ];
}
