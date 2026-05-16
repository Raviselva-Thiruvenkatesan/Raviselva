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
      description: 'Developing scalable web applications and desktop solutions using C#, ASP.NET, and SQL Server. Implementing responsive UIs with Angular and Bootstrap.',
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
