import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { TiltDirective } from '../../directives/tilt.directive';

interface Project {
  title: string;
  description: string;
  category: 'Web' | 'Desktop' | 'Hardware';
  tech: string[];
  imageClass: string;
  icon: string;
  demoLink: string;
  githubLink: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective, TiltDirective],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent {
  // Replace '#' with a real URL to show the Demo / Code buttons for a project.
  projects: Project[] = [
    {
      title: 'Kids Edutainment Website',
      description: 'A comprehensive interactive platform designed to make learning fun for kids through games, quizzes, and multimedia content.',
      category: 'Web',
      tech: ['Angular', 'TypeScript', 'Bootstrap 5', 'CSS3'],
      imageClass: 'bg-gradient-1',
      icon: 'bi-controller',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'The Dilemma of Euthanasia',
      description: 'An analytical study and visualization platform addressing the ethical, medical, and legal aspects of euthanasia.',
      category: 'Web',
      tech: ['C#', 'ASP.NET', 'SQL Server'],
      imageClass: 'bg-gradient-2',
      icon: 'bi-bar-chart-line',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'Arduino Humanoid Robot',
      description: 'A robotics project involving the programming and assembly of a humanoid robot using Arduino microcontrollers.',
      category: 'Hardware',
      tech: ['C++', 'Arduino', 'Hardware'],
      imageClass: 'bg-gradient-3',
      icon: 'bi-robot',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'Vision Political Strategy Website',
      description: 'Modern responsive political strategy website developed using Angular with clean UI, smooth animations, and mobile-friendly design.',
      category: 'Web',
      tech: ['Angular', 'TypeScript', 'Bootstrap 5', 'SCSS'],
      imageClass: 'bg-gradient-2',
      icon: 'bi-megaphone',
      demoLink: 'https://thevisionind.co.in/',
      githubLink: '#'
    },
    {
      title: 'BIM Software Development',
      description: 'Developing BIM and engineering desktop applications including ViskarSteelLight and ViskarSteelChecker using modern WPF MVVM architecture.',
      category: 'Desktop',
      tech: ['C#', '.NET', 'WPF', 'MVVM', 'XAML'],
      imageClass: 'bg-gradient-1',
      icon: 'bi-building-gear',
      demoLink: '#',
      githubLink: '#'
    }
  ];

  filters = ['All', ...Array.from(new Set(this.projects.map(p => p.category)))];
  activeFilter = 'All';

  get visibleProjects(): Project[] {
    return this.activeFilter === 'All'
      ? this.projects
      : this.projects.filter(p => p.category === this.activeFilter);
  }

  countFor(filter: string): number {
    return filter === 'All' ? this.projects.length : this.projects.filter(p => p.category === filter).length;
  }

  trackByTitle(_: number, p: Project) {
    return p.title;
  }

  hasLink(url: string): boolean {
    return !!url && url !== '#';
  }
}
