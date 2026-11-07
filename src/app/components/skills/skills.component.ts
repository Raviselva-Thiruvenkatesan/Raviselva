import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.scss']
})
export class SkillsComponent {
  skills = [
    { name: 'C# / .NET', percent: 90 },
    { name: 'Angular', percent: 85 },
    { name: 'Xaml / WPF / Mvvm', percent: 92 },
    { name: 'JavaScript / TS', percent: 85 },
    { name: 'SQL Server / Sqlite', percent: 85 },
    { name: 'Git', percent: 90 },
    { name: 'Bootstrap', percent: 85 },
    { name: 'Html / CSS', percent: 85 }
  ];

  marqueeItems = [
    'C#', 'WPF MVVM', 'VTK', '3D Rendering', 'Performance Tuning', 'Multithreading', 'Windows Forms',
    'ASP.NET Core', 'Entity Framework', 'Stored Procedures', 'REST APIs', 'Angular', 'TypeScript',
    'HTML5', 'SCSS', 'Bootstrap', 'jQuery', 'Git'
  ];
}
