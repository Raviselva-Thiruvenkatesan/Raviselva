import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';
import { HeroSceneComponent } from '../hero-scene/hero-scene.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective, HeroSceneComponent],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent implements OnInit, OnDestroy {
  roles = ['Software Engineer', '.NET Developer', 'Angular Enthusiast', 'Problem Solver'];

  /**
   * Put your CV in the `public/` folder (e.g. public/Raviselva_Resume.pdf) and set the
   * file name here. The "Download Resume" button only shows when this is set.
   */
  resumeUrl = '';

  // A signal so the view updates from setTimeout (this app runs without Zone.js).
  currentRole = signal('');
  roleIndex = 0;
  charIndex = 0;
  isDeleting = false;

  private timer?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.currentRole.set(this.roles[0]);
      return;
    }
    this.typeEffect();
  }

  typeEffect() {
    const current = this.roles[this.roleIndex];

    if (this.isDeleting) {
      this.currentRole.set(current.substring(0, this.charIndex - 1));
      this.charIndex--;
    } else {
      this.currentRole.set(current.substring(0, this.charIndex + 1));
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

    this.timer = setTimeout(() => this.typeEffect(), typeSpeed);
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
  }
}
