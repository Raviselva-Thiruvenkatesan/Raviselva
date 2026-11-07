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
      description: 'Developing the Viskar suite of Windows applications: ViskarSteel Light, ViskarBIM, and the BIM supporting products DigiLenz and GreenPdf (powered by Viskar), using C#, .NET, WPF, MVVM and XAML. Worked on a 3D render engine built on the VTK toolkit, and currently focused on software performance.',
      icon: 'bi-laptop'
    },
    {
      title: 'IT Intern',
      company: 'Vee Technologies Pvt Ltd, Salem',
      date: 'Feb 2024 - Apr 2024',
      description: 'Assisted in building internal tools and learned modern software architecture practices. Contributed to frontend and backend module development.',
      icon: 'bi-code-square'
    },
    {
      title: '.NET Development Course',
      company: 'Accord Info Matrix',
      date: 'Training',
      description: 'Completed a .NET development course, building the foundation in C#.NET for Windows and web applications.',
      icon: 'bi-patch-check'
    },
    {
      title: 'B.Tech, Information Technology',
      company: 'Velalar College of Engineering and Technology',
      date: 'Graduated 2023',
      description: 'Graduated with 79.3%. Projects in data analytics, front-end development and robotics.',
      icon: 'bi-mortarboard'
    }
  ];
}
