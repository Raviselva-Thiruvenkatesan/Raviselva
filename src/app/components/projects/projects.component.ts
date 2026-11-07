import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { TiltDirective } from '../../directives/tilt.directive';

interface Project {
  title: string;
  /** Small line under the title: where / when. */
  meta: string;
  description: string;
  category: 'Professional' | 'Web' | 'Data' | 'Hardware';
  tech: string[];
  imageClass: string;
  icon: string;
  /** Optional ribbon on the image, e.g. "Current" or a prize. */
  ribbon?: string;
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
    /* ---- Professional: Viskar product suite at RGS Construction Technology ---- */
    {
      title: 'ViskarSteel Light',
      meta: 'Viskar · RGS Construction Technology',
      description: 'Windows desktop application for steel-structure engineering in the Viskar suite. I build features and UI in C#, WPF and MVVM.',
      category: 'Professional',
      tech: ['Windows', 'C#', '.NET', 'WPF', 'MVVM', 'XAML'],
      imageClass: 'bg-gradient-steel',
      icon: 'bi-building-gear',
      ribbon: 'Current',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'ViskarBIM',
      meta: 'Viskar · RGS Construction Technology',
      description: 'Windows desktop application for Building Information Modelling (BIM) in the Viskar suite, developed with C#, .NET and WPF.',
      category: 'Professional',
      tech: ['Windows', 'C#', '.NET', 'WPF', 'BIM'],
      imageClass: 'bg-gradient-bim',
      icon: 'bi-buildings',
      ribbon: 'Current',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: '3D Render Engine (VTK)',
      meta: 'Viskar · RGS Construction Technology',
      description: '3D rendering engine built on the VTK (Visualization Toolkit) that visualises engineering models inside the Viskar Windows applications. My current focus is software performance: making rendering and the applications around it faster.',
      category: 'Professional',
      tech: ['Windows', 'C#', 'VTK', '3D Rendering', 'Performance'],
      imageClass: 'bg-gradient-render',
      icon: 'bi-box',
      ribbon: 'Current',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'DigiLenz',
      meta: 'Powered by Viskar · BIM supporting product',
      description: 'Windows application that supports BIM workflows, powered by the Viskar platform. I develop it as a .NET developer.',
      category: 'Professional',
      tech: ['Windows', 'C#', '.NET', 'BIM'],
      imageClass: 'bg-gradient-lens',
      icon: 'bi-lightning-charge',
      ribbon: 'Current',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'GreenPdf',
      meta: 'Powered by Viskar · BIM supporting product',
      description: 'Windows PDF application that supports BIM workflows, powered by the Viskar platform. I develop it as a .NET developer.',
      category: 'Professional',
      tech: ['Windows', 'C#', '.NET', 'PDF', 'BIM'],
      imageClass: 'bg-gradient-green',
      icon: 'bi-file-earmark-pdf',
      ribbon: 'Current',
      demoLink: '#',
      githubLink: '#'
    },

    /* ---- Earlier and academic projects ---- */
    {
      title: 'Vision Political Strategy Website',
      meta: 'Freelance web project',
      description: 'Modern responsive political strategy website developed using Angular with clean UI, smooth animations, and mobile-friendly design.',
      category: 'Web',
      tech: ['Angular', 'TypeScript', 'Bootstrap 5', 'SCSS'],
      imageClass: 'bg-gradient-2',
      icon: 'bi-megaphone',
      demoLink: 'https://thevisionind.co.in/',
      githubLink: '#'
    },
    {
      title: 'The Dilemma of Euthanasia',
      meta: 'Data Analytics · Dec 2022 – Apr 2023',
      description: 'An analytical study of the ethical, medical and legal dilemma of euthanasia using RapidMiner, with an AIML chatbot that offers a four-quadrant solution.',
      category: 'Data',
      tech: ['RapidMiner', 'AIML', 'Chatbot', 'Data Analytics'],
      imageClass: 'bg-gradient-2',
      icon: 'bi-bar-chart-line',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'Kids Edutainment Website',
      meta: 'Front-end Development · Dec 2021 – Apr 2022',
      description: 'An interactive platform designed to make learning fun for kids through games, quizzes, and multimedia content.',
      category: 'Web',
      tech: ['Angular', 'TypeScript', 'Bootstrap 5', 'CSS3'],
      imageClass: 'bg-gradient-1',
      icon: 'bi-controller',
      demoLink: '#',
      githubLink: '#'
    },
    {
      title: 'Arduino Humanoid Robot',
      meta: 'Microcontrollers & Microprocessors · Dec 2019 – Apr 2020',
      description: 'Built a humanoid robot capable of walking, 360° head rotation, voice interaction and a hand-shake, programmed on Arduino microcontrollers.',
      category: 'Hardware',
      tech: ['C++', 'Arduino', 'Electronics'],
      imageClass: 'bg-gradient-3',
      icon: 'bi-robot',
      ribbon: 'VI Prize',
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
