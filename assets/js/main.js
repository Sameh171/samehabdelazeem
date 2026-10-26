/**
 * samehabdelazeem.com – site behaviour and motion (no dependencies).
 * Every block checks that its elements exist, so this file is safe on any page.
 *
 * Motion contract with main.css:
 * - html.fx (added here) arms the hidden start states; without JS nothing hides.
 * - html.is-loaded is set when the loader leaves; [data-intro] elements play then.
 * - [data-split] headings are split into .w > span words here.
 * - .reveal elements get .is-visible on scroll; data-reveal="left|right|zoom".
 */
(function() {
  "use strict";

  const root = document.documentElement;
  root.classList.add('js', 'fx');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('#site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const toTop = document.querySelector('.to-top');

  /**
   * Split [data-split] headings into words (keeps nested spans like .accent)
   */
  document.querySelectorAll('[data-split]').forEach(el => {
    let i = 0;
    (function walk(node) {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) return walk(child);
        if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
          const word = document.createElement('span');
          const inner = document.createElement('span');
          word.className = 'w';
          inner.textContent = part;
          inner.style.setProperty('--wi', i++);
          word.appendChild(inner);
          frag.appendChild(word);
        });
        child.replaceWith(frag);
      });
    })(el);
  });

  // Intro elements play in document order
  document.querySelectorAll('[data-intro]').forEach((el, i) => {
    el.style.setProperty('--d', `${150 + i * 110}ms`);
  });

  /**
   * Loader: tracks image/font progress, stays a minimum time on the first
   * page of a visit (shorter afterwards), then lifts like a curtain.
   * A CSS failsafe in main.css removes it even if this never runs.
   */
  const loader = document.querySelector('.loader');
  let firstVisit = true;
  try {
    firstVisit = !sessionStorage.getItem('sa-visited');
    sessionStorage.setItem('sa-visited', '1');
  } catch (e) { /* storage blocked: treat as first visit */ }

  function revealPage() {
    if (root.classList.contains('is-loaded')) return;
    if (loader) {
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 1200);
    }
    setTimeout(() => root.classList.add('is-loaded'), loader && !reduceMotion ? 350 : 0);
  }

  if (loader) {
    const bar = loader.querySelector('.loader-bar span');
    const images = [...document.images].filter(img => img.loading !== 'lazy');
    const total = images.length + 1;
    let done = 0;
    const tick = () => {
      done++;
      if (bar) bar.style.transform = `scaleX(${Math.min(done / total, 1)})`;
    };
    images.forEach(img => {
      if (img.complete) tick();
      else {
        img.addEventListener('load', tick, { once: true });
        img.addEventListener('error', tick, { once: true });
      }
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(tick, tick);

    const minTime = reduceMotion ? 0 : (firstVisit ? 1200 : 450);
    const started = performance.now();
    const finish = () => {
      if (bar) bar.style.transform = 'scaleX(1)';
      setTimeout(revealPage, Math.max(0, minTime - (performance.now() - started)) + 200);
    };
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
    setTimeout(revealPage, 5000);
  } else {
    revealPage();
  }

  // Coming back through the history cache: make sure nothing is left covering the page
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    const wipe = document.querySelector('.page-wipe');
    if (wipe) wipe.classList.remove('is-active');
    revealPage();
  });

  /**
   * Page transition for links to other pages of the site
   */
  if (!reduceMotion) {
    const wipe = document.createElement('div');
    wipe.className = 'page-wipe';
    wipe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wipe);

    document.addEventListener('click', e => {
      const link = e.target.closest('a[href]');
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same-page anchor
      e.preventDefault();
      wipe.classList.add('is-active');
      setTimeout(() => { location.href = url.href; }, 450);
    });
  }

  /**
   * Scroll progress bar
   */
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  const heroImg = document.querySelector('.hero-photo img');

  /**
   * Header shadow, back-to-top, progress and hero parallax on scroll
   */
  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 10);
    if (toTop) toTop.classList.toggle('is-visible', y > 600);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (heroImg && !reduceMotion && y < window.innerHeight * 1.2) {
      heroImg.style.transform = `translateY(${y * 0.08}px) scale(${1 + y * 0.0002})`;
    }
  }

  /**
   * Mobile navigation
   */
  function setNav(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    const icon = toggle.querySelector('i');
    if (icon) icon.className = open ? 'bi bi-x-lg' : 'bi bi-list';
  }

  if (nav && toggle) {
    toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setNav(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setNav(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1200) setNav(false);
    });
  }

  /**
   * Scrollspy: sections carry data-nav="<id of the nav target>"; the last
   * section whose top has passed the header marks its nav link active.
   */
  const spyLinks = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
  const spySections = [...document.querySelectorAll('[data-nav]')];

  function spy() {
    if (!spyLinks.length || !spySections.length) return;
    const line = window.scrollY + (header ? header.offsetHeight : 0) + window.innerHeight * 0.3;
    let current = spySections[0];
    spySections.forEach(section => {
      if (section.offsetTop <= line) current = section;
    });
    // At the very bottom the last section wins even if it is short
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      current = spySections[spySections.length - 1];
    }
    const target = '#' + current.dataset.nav;
    spyLinks.forEach(link => {
      const active = link.getAttribute('href') === target;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  /**
   * Back-to-top button
   */
  if (toTop) {
    toTop.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const skipTarget = document.querySelector('#top');
      if (skipTarget) skipTarget.focus({ preventScroll: true });
    });
  }

  let ticking = false;
  document.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      spy();
      ticking = false;
    });
  }, { passive: true });
  window.addEventListener('load', spy);
  window.addEventListener('resize', onScroll);
  onScroll();
  spy();

  /**
   * Count-up numbers (e.g. "1,500+") when they scroll into view
   */
  function countUp(el) {
    const text = el.textContent;
    const match = text.match(/[\d,]+/);
    if (!match || reduceMotion) return;
    const target = parseInt(match[0].replace(/,/g, ''), 10);
    const useComma = match[0].includes(',');
    const duration = 1600;
    const start = performance.now();
    (function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(target * eased);
      el.textContent = text.replace(match[0], useComma ? value.toLocaleString('en-US') : String(value));
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }

  /**
   * Reveal on scroll (fires once). Siblings are staggered. Without
   * IntersectionObserver everything simply stays visible.
   */
  const revealEls = [...document.querySelectorAll('.reveal')];
  revealEls.forEach(el => {
    const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    const index = siblings.indexOf(el);
    if (index > 0) el.style.setProperty('--d', `${Math.min(index, 6) * 90}ms`);
  });

  function onSeen(el) {
    el.classList.add('is-visible');
    el.querySelectorAll('.facts strong').forEach(countUp);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        onSeen(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(onSeen);
  }

  /**
   * Pointer effects: card spotlight + tilt, magnetic buttons
   */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.focus-card, .topic-card, .insight, .pillar, .steps li, .question-card').forEach(card => {
      card.classList.add('fx-spot');
      card.addEventListener('pointermove', e => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    });

    document.querySelectorAll('.focus-card, .insight, .topic-card').forEach(card => {
      card.classList.add('fx-tilt');
      card.addEventListener('pointermove', e => {
        if (!card.classList.contains('is-visible') && card.classList.contains('reveal')) return;
        const rect = card.getBoundingClientRect();
        const rx = -((e.clientY - rect.top) / rect.height - 0.5) * 6;
        const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    document.querySelectorAll('.button, .nav-cta, .to-top').forEach(btn => {
      btn.classList.add('fx-magnet');
      btn.addEventListener('pointermove', e => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.18;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /**
   * Contact subject: links with data-subject="..." on this page, or
   * ?subject=... from another page, prefill the form
   */
  const subjectField = document.querySelector('#subject-field');
  if (subjectField) {
    const fromQuery = new URLSearchParams(location.search).get('subject');
    if (fromQuery) subjectField.value = fromQuery.slice(0, 120);
    document.querySelectorAll('a[data-subject]').forEach(link => {
      link.addEventListener('click', () => {
        if (!subjectField.value) subjectField.value = link.dataset.subject;
      });
    });
  }

  /**
   * Current year in the footer
   */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /**
   * Contact form: POSTs JSON to the Resend-backed Cloudflare Worker, which
   * emails a confirmation to the sender.
   */
  const form = document.querySelector('#contact-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');

    const escapeHtml = str => str.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);

    function setStatus(state, message) {
      status.dataset.state = state;
      status.textContent = message;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();

      const name = form.querySelector('#name-field').value.trim();
      const email = form.querySelector('#email-field').value.trim();
      const subject = form.querySelector('#subject-field').value.trim();
      const message = form.querySelector('#message-field').value.trim();
      const safe = {
        name: escapeHtml(name),
        email: escapeHtml(email),
        message: escapeHtml(message).replace(/\n/g, '<br/>')
      };

      const data = {
        to: email,
        subject: subject,
        text: `
Hello ${name},

Thank you for contacting Sameh Abdelazeem. Your message has been received and I will get back to you as soon as I can.

Your message:
--------------
Name: ${name}
Email: ${email}
Message:
${message}

Best regards,
Sameh Abdelazeem
www.samehabdelazeem.com
`,
        html: `
  <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 12px; border-top: 6px solid #c6f135;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://samehabdelazeem.com/assets/img/Logo2.png" alt="Sameh Abdelazeem" style="max-height: 60px;" />
      </div>
      <h2 style="color: #0b1d38;">Hello ${safe.name},</h2>
      <p>Thank you for reaching out. Your message has been received and I will get back to you as soon as I can.</p>
      <div style="margin-top: 30px;">
        <h3 style="color: #0b1d38;">Your message</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #eee;"><strong>Name</strong></td>
            <td style="padding: 8px; border: 1px solid #eee;">${safe.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #eee;"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #eee;">${safe.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #eee;"><strong>Message</strong></td>
            <td style="padding: 8px; border: 1px solid #eee;">${safe.message}</td>
          </tr>
        </table>
      </div>
      <p style="margin-top: 30px;">Best regards,<br/><strong>Sameh Abdelazeem</strong><br/>Technology · Business Growth · Training</p>
      <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
      <footer style="font-size: 12px; text-align: center; color: #999;">
        &copy; ${new Date().getFullYear()} Sameh Abdelazeem<br/>
        <a href="https://samehabdelazeem.com" style="color: #999;">samehabdelazeem.com</a>
      </footer>
    </div>
  </div>
`
      };

      setStatus('loading', 'Sending…');
      if (button) button.disabled = true;

      try {
        const response = await fetch('https://resend-worker.sameh-232.workers.dev/sendEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json().catch(() => ({}));

        if (response.ok && result.success) {
          setStatus('success', 'Thank you — your message has been sent. A confirmation is on its way to your inbox.');
          form.reset();
        } else {
          setStatus('error', 'Sorry, the message could not be sent. Please try again or use the email address on this page.');
        }
      } catch (err) {
        setStatus('error', 'Sorry, something went wrong. Please check your connection or use the email address on this page.');
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

})();
