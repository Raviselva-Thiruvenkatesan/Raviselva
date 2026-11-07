import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import emailjs, { EmailJSResponseStatus } from '@emailjs/browser';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

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

  status = signal<FormStatus>('idle');

  isExternal(url: string) {
    return url.startsWith('http');
  }

  onSubmit(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    this.status.set('sending');

    emailjs.sendForm(
      'YOUR_SERVICE_ID',
      'YOUR_TEMPLATE_ID',
      form,
      'YOUR_PUBLIC_KEY'
    ).then(
      () => {
        this.status.set('success');
        form.reset();
      },
      (error: EmailJSResponseStatus) => {
        console.error(error);
        this.status.set('error');
      }
    );
  }
}
