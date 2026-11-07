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
    {
      title: 'Rotaract District Chair',
      description: 'District Chair – Business Forum, Rotaract RID 3203 (2023–24), and Group Rotaract Representative for Group 1 (2022–23).',
      icon: 'bi-award'
    },
    {
      title: 'Rotaract Club President',
      description: 'President of the Rotaract Club of VCET (2021–22), after serving as Pro Chairman (2020–21) and later as Club Advisor (2022–23).',
      icon: 'bi-people'
    },
    {
      title: 'Robotics Prize',
      description: 'Won VI Prize for an Arduino humanoid robot with walking, 360° head rotation, voice and hand-shake.',
      icon: 'bi-robot'
    },
    {
      title: 'Hackathons',
      description: 'Participated and won in several college-level hackathons.',
      icon: 'bi-trophy'
    },
    {
      title: 'Emcee',
      description: 'Served as emcee (master of ceremonies), hosting events on stage.',
      icon: 'bi-mic'
    }
  ];
}
