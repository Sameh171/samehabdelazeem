/**
 * samehabdelazeem.com – site behaviour (no dependencies).
 * Every block checks that its elements exist, so this file is safe on any page.
 */
(function() {
  "use strict";

  document.documentElement.classList.add('js');

  const header = document.querySelector('.site-header');
  const nav = document.querySelector('#site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const toTop = document.querySelector('.to-top');

  /**
   * Header shadow once the page scrolls
   */
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 10);
    if (toTop) toTop.classList.toggle('is-visible', window.scrollY > 600);
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
  onScroll();
  spy();

  /**
   * Reveal on scroll (fires once). Without IntersectionObserver everything
   * simply stays visible.
   */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /**
   * Links with data-subject="..." prefill the contact form subject
   */
  const subjectField = document.querySelector('#subject-field');
  if (subjectField) {
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
