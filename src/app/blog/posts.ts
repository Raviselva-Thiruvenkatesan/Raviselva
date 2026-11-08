/**
 * Blog posts. Content is plain data (no HTML strings), rendered by BlogPostComponent with normal
 * Angular bindings, so nothing here can inject markup and it works under the strict CSP.
 *
 * To add a post: add an entry at the TOP of POSTS (newest first) with a unique `slug`.
 * It is pre-rendered automatically at build time (see app.routes.server.ts).
 */

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'note'; text: string };

export interface Post {
  slug: string;
  title: string;
  summary: string;
  date: string;          // ISO yyyy-mm-dd
  tags: string[];
  icon: string;          // bootstrap-icons class
  blocks: Block[];
}

export const POSTS: Post[] = [
  {
    slug: 'interactive-3d-steel-frame-threejs',
    title: 'Building an interactive 3D steel frame for my portfolio with Three.js',
    summary:
      'How the steel structure on my home page is built: I-section members, bolted end plates and welds drawn with ' +
      'instanced meshes, a storey-by-storey build animation, and click-to-inspect picking.',
    date: '2026-11-08',
    tags: ['Three.js', '3D', 'BIM', 'Angular'],
    icon: 'bi-building-gear',
    blocks: [
      { type: 'p', text: 'I work on BIM software for steel structures, so I wanted the first thing visitors see on my portfolio to be a steel frame they can actually explore. This post walks through how it is built and the decisions that keep it fast.' },

      { type: 'h2', text: 'Modelling members, not boxes' },
      { type: 'p', text: 'Columns and beams use a real I-section profile. I draw the outline once with a Three.js Shape (two flanges and a web), extrude it to a length of one unit along Z, and centre it. Every column and beam is then that one geometry, stretched along its own axis.' },
      { type: 'code', lang: 'ts', code: "const s = new THREE.Shape();\ns.moveTo(-b, -d); s.lineTo(b, -d); s.lineTo(b, -d + flange); /* … web and top flange … */\nconst geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });\ngeo.translate(0, 0, -0.5);   // centre the unit-length member" },
      { type: 'p', text: 'Connections matter as much as members in steel. Each beam end gets a bolted end plate with eight hex bolts and fillet-weld beads along the web and flanges. Braces end in gusset plates, columns have splice plates every second storey, and base plates are held down by anchor bolts.' },

      { type: 'h2', text: 'Thousands of parts, a handful of draw calls' },
      { type: 'p', text: 'The frame has about 4,500 parts (over 2,600 of them bolts). Drawing each as its own mesh would be thousands of draw calls. Instead every part type is one InstancedMesh: the GPU gets one geometry and a list of transforms. The whole structure renders in about a dozen draw calls.' },
      { type: 'ul', items: [
        'Each part stores its final position, rotation and length.',
        'A member’s transform is composed from those values, so a unit-length beam becomes a 4.4 m beam.',
        'Parts are collected first so every InstancedMesh is created with an exact count.'
      ] },

      { type: 'h2', text: 'The build animation' },
      { type: 'p', text: 'Every part also has a start delay based on its storey: columns first, then beams, end plates, bolts and welds, then bracing. Each frame, the part eases down into place from slightly above while scaling up from zero. The timeline uses real elapsed time, so the build finishes on schedule even on a slow phone.' },

      { type: 'h2', text: 'Click to inspect' },
      { type: 'p', text: 'In explore mode the camera is driven by OrbitControls. Clicking a part casts a ray from the pointer; Three.js reports which InstancedMesh was hit and the instance index, and I look up that index in a parallel array of labels (grid reference, level, section, bolt count). A slightly enlarged translucent copy of the same geometry, placed with the instance’s matrix, makes the highlight.' },
      { type: 'note', text: 'Tip: zoom-to-cursor in OrbitControls makes inspecting small details like bolts far easier than zooming to the centre of the screen.' },

      { type: 'h2', text: 'Keeping it light' },
      { type: 'ul', items: [
        'Three.js is loaded with a dynamic import only after the page has rendered, so it never delays the first paint.',
        'OrbitControls is a separate 4 KB chunk that loads only when someone opens the viewer.',
        'Rendering pauses when the hero is off-screen or the tab is hidden.',
        'Visitors who ask their OS to reduce motion get the finished structure as a still frame.'
      ] },
      { type: 'p', text: 'The result is a hero section that says what I do better than a paragraph could, without costing visitors anything if they never touch it.' }
    ]
  },
  {
    slug: 'zoneless-angular-animations-signals',
    title: 'Why my typing animation froze in a zoneless Angular app (and how signals fixed it)',
    summary:
      'Angular apps without Zone.js only re-render when something tells them to. Here is the bug that taught me that, ' +
      'and the patterns I now use for timers, scroll handlers and animation loops.',
    date: '2026-11-08',
    tags: ['Angular', 'Signals', 'Performance'],
    icon: 'bi-lightning-charge',
    blocks: [
      { type: 'p', text: 'My portfolio’s hero has a typing effect that cycles through job titles. One day I noticed it was stuck on a single letter. The code looked fine: a setTimeout loop updating a string. The cause was that the app runs without Zone.js.' },

      { type: 'h2', text: 'What Zone.js used to do for you' },
      { type: 'p', text: 'Classic Angular patches browser APIs like setTimeout and addEventListener, so after any callback it runs change detection automatically. Zoneless Angular drops that patching. It re-renders only when it is notified: a template event, an input change, or a signal that a template reads.' },
      { type: 'p', text: 'So a plain class field changed inside setTimeout updates the value in memory, but nothing tells Angular to update the screen.' },

      { type: 'h2', text: 'The fix: signals' },
      { type: 'code', lang: 'ts', code: "// before: never re-renders when changed from a timer\ncurrentRole = '';\n\n// after: the template re-renders whenever the signal changes\ncurrentRole = signal('');\nthis.currentRole.set(current.substring(0, this.charIndex + 1));" },
      { type: 'p', text: 'In the template, read it as currentRole(). Any code path that updates state from outside an Angular event (timers, IntersectionObserver callbacks, requestAnimationFrame) should write to a signal.' },

      { type: 'h2', text: 'The opposite problem: too many re-renders' },
      { type: 'p', text: 'While fixing that, I found the reverse. A @HostListener for window scroll or pointermove counts as an Angular event, so it schedules change detection for the whole app on every scroll tick or mouse move. For a navbar that only needs to know whether you have scrolled past 50px, that is wasted work.' },
      { type: 'ul', items: [
        'Use a passive addEventListener in ngOnInit and remove it in ngOnDestroy.',
        'Write the result to a signal; setting a signal to the same value does nothing, so the UI only updates when the threshold is crossed.',
        'Do per-frame visual work (like a 3D tilt) directly on the DOM element, outside Angular.'
      ] },

      { type: 'h2', text: 'NgZone calls become no-ops' },
      { type: 'p', text: 'Code copied from zone-based examples often wraps work in ngZone.run or runOutsideAngular. Without Zone.js these do nothing, and leaving them in hides the real change-detection model. I removed them and made signals the only way state reaches the view.' },
      { type: 'note', text: 'Rule of thumb for zoneless Angular: if a value changes anywhere other than a template event handler, it should be a signal.' }
    ]
  },
  {
    slug: 'hardening-static-angular-portfolio',
    title: 'Hardening a static Angular portfolio: CSP, dependency updates and a spam-resistant contact form',
    summary:
      'A portfolio is a small site, but it still ships JavaScript to strangers. The security checklist I worked through: ' +
      'updating vulnerable packages, a Content Security Policy, and protecting the contact form.',
    date: '2026-11-08',
    tags: ['Security', 'Angular', 'CSP'],
    icon: 'bi-shield-lock',
    blocks: [
      { type: 'p', text: 'It is easy to think a personal site has nothing worth protecting. But it runs code in visitors’ browsers and has a contact form that sends email on my behalf. Here is what I checked and changed.' },

      { type: 'h2', text: '1. Update what ships to visitors' },
      { type: 'p', text: 'npm audit split the problems into two groups. The packages that reach the browser had seven known issues, including ways to bypass Angular’s XSS sanitisation. The build tools had many more, but none of that code is shipped.' },
      { type: 'p', text: 'npm audit fix could not move Angular on its own, because the framework packages must be updated together. Setting all @angular/* packages to the latest patch of the same major version and installing them at once brought the shipped code to zero known vulnerabilities.' },

      { type: 'h2', text: '2. A Content Security Policy' },
      { type: 'p', text: 'A CSP tells the browser which scripts, styles and connections the page may use, so an injected script simply will not run. Angular can generate the hard part: with security.autoCsp enabled in angular.json, production builds get a script policy with hashes of the inline scripts and strict-dynamic for the app’s own chunks.' },
      { type: 'code', lang: 'json', code: '"configurations": {\n  "production": {\n    "security": { "autoCsp": true }\n  }\n}' },
      { type: 'p', text: 'On top of that I added a policy limiting styles and fonts to Google Fonts, network requests to the email service, and blocking plugins, frames and form posts elsewhere. I tested it by injecting an inline event handler, an external script and a tracking pixel: all three were blocked.' },

      { type: 'h2', text: '3. Protecting the contact form' },
      { type: 'ul', items: [
        'A honeypot field hidden from people and screen readers; bots that fill it get a fake success.',
        'Submissions within three seconds of page load are treated as bots.',
        'A cooldown between sends, and length limits enforced in code as well as HTML.',
        'Line breaks stripped from name and email so nothing can smuggle extra headers.',
        'In the email service dashboard: allowed domains and reCAPTCHA, because a public key is visible to anyone.'
      ] },

      { type: 'h2', text: '4. Checks that came back clean' },
      { type: 'ul', items: [
        'No innerHTML, eval or sanitiser bypasses anywhere in the app.',
        'Every link that opens a new tab uses rel="noopener noreferrer".',
        'No secrets in the repository or its history.',
        'No source maps in the production build, and no location data in published photos.'
      ] },
      { type: 'note', text: 'Writing blog posts as structured data rendered with normal bindings (not HTML strings) keeps this very page compatible with the same strict CSP.' }
    ]
  }
];

export function findPost(slug: string): Post | undefined {
  return POSTS.find(p => p.slug === slug);
}

/** Rough reading time at ~200 words per minute. */
export function readingMinutes(post: Post): number {
  const text = post.blocks
    .map(b => (b.type === 'ul' ? b.items.join(' ') : b.type === 'code' ? b.code : b.text))
    .join(' ');
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}
