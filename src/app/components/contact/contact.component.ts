import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  socialLinks = [
    { name: 'LinkedIn', icon: 'bi-linkedin', url: 'https://www.linkedin.com/in/raviselva/' },
    { name: 'GitHub', icon: 'bi-github', url: 'https://github.com/Raviselva-Thiruvenkatesan' },
    { name: 'Email', icon: 'bi-envelope-fill', url: 'mailto:raviselva.t@gmail.com' },
    { name: 'Instagram', icon: 'bi-instagram', url: 'https://www.instagram.com/raviselva.thiruvenkatesan?igsh=MW8yb24yMTk1a213Zw%3D%3D&utm_source=qr' }
  ];

  onSubmit(event: Event) {
    event.preventDefault();
    alert('Thank you for your message!');
  }
}
