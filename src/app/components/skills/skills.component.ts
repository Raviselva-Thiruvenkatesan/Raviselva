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
    { name: 'SQL Server', percent: 80 },
    { name: 'JavaScript / TS', percent: 85 }
  ];

  marqueeItems = [
    'HTML5', 'CSS3', 'SCSS', 'Bootstrap', 'WPF MVVM', 'jQuery', 'Git', 'REST APIs', 'Entity Framework', 'ASP.NET Core', 'C#', 'Angular', 'TypeScript'
  ];
}
