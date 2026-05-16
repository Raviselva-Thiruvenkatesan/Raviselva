import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent implements OnInit {
  roles = ['Software Engineer', '.NET Developer', 'Angular Enthusiast', 'Problem Solver'];
  currentRole = '';
  roleIndex = 0;
  charIndex = 0;
  isDeleting = false;

  ngOnInit() {
    this.typeEffect();
  }

  typeEffect() {
    const current = this.roles[this.roleIndex];
    
    if (this.isDeleting) {
      this.currentRole = current.substring(0, this.charIndex - 1);
      this.charIndex--;
    } else {
      this.currentRole = current.substring(0, this.charIndex + 1);
      this.charIndex++;
    }

    let typeSpeed = this.isDeleting ? 50 : 100;

    if (!this.isDeleting && this.charIndex === current.length) {
      typeSpeed = 2000;
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.roleIndex = (this.roleIndex + 1) % this.roles.length;
      typeSpeed = 500;
    }

    setTimeout(() => this.typeEffect(), typeSpeed);
  }
}
