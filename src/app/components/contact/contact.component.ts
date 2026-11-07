import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import emailjs, { EmailJSResponseStatus } from '@emailjs/browser';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

type FormStatus = 'idle' | 'sending' | 'success' | 'error' | 'mailto' | 'cooldown';

/**
 * EmailJS settings — copy these from https://dashboard.emailjs.com
 * (Email Services → Service ID, Email Templates → Template ID, Account → Public Key).
 * Until all three are filled in, the form opens the visitor's email app instead,
 * so no message is ever lost.
 *
 * Once filled in, also open the EmailJS dashboard → Account → Security and:
 *  - restrict requests to your site's domain, and
 *  - turn on reCAPTCHA / rate limiting,
 * because the public key is visible to anyone who views the page source.
 */
const EMAILJS = {
  serviceId: '',
  templateId: '',
  publicKey: ''
};

const CONTACT_EMAIL = 'raviselva.t@gmail.com';

/** Anti-spam: submissions faster than this after page load are treated as bots. */
const MIN_FILL_MS = 3000;
/** Anti-spam: minimum gap between two sends from the same page. */
const COOLDOWN_MS = 60_000;
const LIMITS = { from_name: 100, from_email: 254, message: 5000 } as const;
const MIN_MESSAGE = 10;

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
    { name: 'Email', icon: 'bi-envelope-fill', url: `mailto:${CONTACT_EMAIL}` },
    { name: 'Instagram', icon: 'bi-instagram', url: 'https://www.instagram.com/raviselva.thiruvenkatesan?igsh=MW8yb24yMTk1a213Zw%3D%3D&utm_source=qr' }
  ];

  contactEmail = CONTACT_EMAIL;
  status = signal<FormStatus>('idle');

  private readonly emailJsReady = !!(EMAILJS.serviceId && EMAILJS.templateId && EMAILJS.publicKey);
  private readonly loadedAt = Date.now();
  private lastSentAt = 0;

  isExternal(url: string) {
    return url.startsWith('http');
  }

  onSubmit(event: Event) {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    this.sanitize(form);
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Bots: filled the hidden honeypot, or submitted faster than a person could type.
    // Pretend it worked so they don't adapt, but send nothing.
    const honeypot = (form.elements.namedItem('website') as HTMLInputElement | null)?.value;
    if (honeypot || Date.now() - this.loadedAt < MIN_FILL_MS) {
      this.status.set('success');
      form.reset();
      return;
    }

    if (Date.now() - this.lastSentAt < COOLDOWN_MS) {
      this.status.set('cooldown');
      return;
    }

    if (!this.emailJsReady) {
      this.openMailClient(form);
      return;
    }

    this.status.set('sending');
    emailjs.sendForm(EMAILJS.serviceId, EMAILJS.templateId, form, EMAILJS.publicKey).then(
      () => {
        this.lastSentAt = Date.now();
        this.status.set('success');
        form.reset();
      },
      (error: EmailJSResponseStatus) => {
        console.error(error);
        this.status.set('error');
      }
    );
  }

  /** Trim fields, strip line breaks from single-line fields and enforce length limits. */
  private sanitize(form: HTMLFormElement) {
    for (const [name, max] of Object.entries(LIMITS)) {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!field) continue;
      let value = field.value.trim();
      if (name !== 'message') value = value.split(/\s*[\r\n]+\s*/).join(' ');
      field.value = value.slice(0, max);
    }
    // Browsers only enforce minlength on typed input, so check it here for scripted submits too.
    const message = form.elements.namedItem('message') as HTMLTextAreaElement | null;
    message?.setCustomValidity(
      message.value.length > 0 && message.value.length < MIN_MESSAGE ? `Please write at least ${MIN_MESSAGE} characters.` : ''
    );
  }

  /** Fallback: hand the message to the visitor's email app, pre-filled. */
  private openMailClient(form: HTMLFormElement) {
    const data = new FormData(form);
    const name = String(data.get('from_name') ?? '');
    const email = String(data.get('from_email') ?? '');
    const message = String(data.get('message') ?? '');
    const subject = `Portfolio enquiry from ${name}`;
    const body = `${message}\n\n— ${name} (${email})`;
    window.location.href =
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    this.lastSentAt = Date.now();
    this.status.set('mailto');
  }
}
