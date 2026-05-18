import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent {
  projects = [
    {
      title: 'Kids Edutainment Website',
      description: 'A comprehensive interactive platform designed to make learning fun for kids through games, quizzes, and multimedia content.',
      tech: ['Angular', 'TypeScript', 'Bootstrap 5', 'CSS3'],
      imageClass: 'bg-gradient-1',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'The Dilemma of Euthanasia',
      description: 'An analytical study and visualization platform addressing the ethical, medical, and legal aspects of euthanasia.',
      tech: ['C#', 'ASP.NET', 'SQL Server'],
      imageClass: 'bg-gradient-2',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'Arduino Humanoid Robot',
      description: 'A robotics project involving the programming and assembly of a humanoid robot using Arduino microcontrollers.',
      tech: ['C++', 'Arduino', 'Hardware'],
      imageClass: 'bg-gradient-3',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'Vision Political Strategy Website',
      description: 'Modern responsive political strategy website developed using Angular with clean UI, smooth animations, and mobile-friendly design.',
      tech: ['Angular', 'TypeScript', 'Bootstrap 5', 'SCSS'],
      imageClass: 'bg-gradient-2',
      demoLink: 'https://thevisionind.co.in/',
      githubLink: '#'
    },
    {
      title: 'BIM Software Development',
      description: 'Developing BIM and engineering desktop applications including ViskarSteelLight and ViskarSteelChecker using modern WPF MVVM architecture.',
      tech: ['C#', '.NET', 'WPF', 'MVVM', 'XAML'],
      imageClass: 'bg-gradient-1',
      demoLink: '#',
      githubLink: '#'
    }
  ];
}
