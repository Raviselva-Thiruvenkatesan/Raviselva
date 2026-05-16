import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss']
})
export class AchievementsComponent {
  achievements = [
    { title: 'Leadership', description: 'Led multiple technical and community initiatives.', icon: 'bi-award' },
    { title: 'Rotaract Club', description: 'Active member contributing to community service and organizing events.', icon: 'bi-people' },
    { title: 'Hackathons', description: 'Participated and won in several college-level hackathons.', icon: 'bi-trophy' }
  ];
}
