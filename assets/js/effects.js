/**
 * Effects layer: motion and interactive effects on top of main.js.
 * Styles live in assets/css/effects.css. Every effect checks that its
 * elements exist, so this file is safe to include on any page.
 *
 * Contract with the page:
 * - Load after main.js. main.js leaves #preloader.fx-loader to this file.
 * - The loader markup (#preloader.fx-loader with .fx-loader-bar span and
 *   .fx-loader-pct span) must be the first child of <body> so it paints
 *   before anything else.
 * - #hero h2 must be plain text: it is rebuilt into per-letter spans.
 * - Skill bars live in .skills-content and are filled here only (the markup
 *   must not carry main.js's .skills-animation class).
 * - State classes added here are all is-*; effects.css keys off them.
 */
(function() {
  "use strict";

  /**
   * Feature switches: an effect that is off is never created, so it costs nothing.
   */
  const FX = {
    network: false, // dot network over the hero photo
    cursor: false   // soft ring that follows the mouse
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pointerEffects = finePointer && !reduceMotion;
  const lerp = (a, b, t) => a + (b - a) * t;

  /**
   * Pointer position relative to an element, plus its size
   */
  function localPoint(el, e) {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, width: rect.width, height: rect.height };
  }

  /**
   * Preloader: tracks real image/font progress, then opens like a curtain.
   * It never depends on a single event: a minimum and maximum display time,
   * a timer fallback (rAF pauses in background tabs) and a CSS failsafe in
   * effects.css all guarantee it goes away.
   */
  const ready = new Promise(resolve => {
    const loader = document.querySelector('#preloader.fx-loader');
    if (!loader) {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve);
      return;
    }

    const MIN_MS = reduceMotion ? 0 : 500;
    const MAX_MS = 5000; // keep below the 6s CSS failsafe in effects.css
    const start = performance.now();
    const bar = loader.querySelector('.fx-loader-bar span');
    const pct = loader.querySelector('.fx-loader-pct span');

    // Lazy images only load on scroll, so they don't count toward progress
    const images = [...document.images].filter(img => img.loading !== 'lazy');
    const total = images.length + 1;
    let loaded = 0;
    const countLoaded = () => loaded++;
    images.forEach(img => {
      if (img.complete) {
        loaded++;
      } else {
        img.addEventListener('load', countLoaded, { once: true });
        img.addEventListener('error', countLoaded, { once: true });
      }
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(countLoaded, countLoaded);

    let displayedPct = 0;
    let finished = false;
    let exited = false;

    function render() {
      if (bar) bar.style.transform = `scaleX(${displayedPct / 100})`;
      if (pct) pct.textContent = Math.round(displayedPct);
    }

    function exit() {
      if (exited) return;
      exited = true;
      displayedPct = 100;
      render();
      loader.classList.add('is-done');
      loader.setAttribute('aria-busy', 'false');
      resolve();
      // Remove once the curtain has opened; the timer covers a missed event
      const remove = () => loader.remove();
      const panel = loader.querySelector('.fx-loader-panel--top');
      if (panel) panel.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 2000);
    }

    function frame() {
      if (exited) return;
      const target = finished ? 100 : Math.min(92, (loaded / total) * 100);
      displayedPct = lerp(displayedPct, target, finished ? 0.25 : 0.06);
      render();
      if (finished && displayedPct > 99.5) return exit();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function finish() {
      if (finished) return;
      const wait = Math.max(0, MIN_MS - (performance.now() - start));
      setTimeout(() => {
        finished = true;
        setTimeout(exit, 450);
      }, wait);
    }

    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish);
    setTimeout(finish, MAX_MS);
  });

  ready.then(() => document.documentElement.classList.add('fx-ready'));

  /**
   * Shared animation loop: tasks return true while they are still moving,
   * and the loop stops itself once everything has settled.
   */
  const tasks = new Set();
  let ticking = false;

  function tick() {
    tasks.forEach(task => {
      if (!task()) tasks.delete(task);
    });
    ticking = tasks.size > 0;
    if (ticking) requestAnimationFrame(tick);
  }

  function schedule(task) {
    tasks.add(task);
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
  }

  /**
   * Smoothly follow a set of numeric values. Returns set(values, instant):
   * every call eases the current values toward the new targets and calls
   * render(current) each frame until they settle.
   */
  function follow(initial, ease, render) {
    const current = { ...initial };
    const target = { ...initial };

    function step() {
      let moving = false;
      for (const key in current) {
        current[key] = lerp(current[key], target[key], ease);
        if (Math.abs(current[key] - target[key]) > 0.005) moving = true;
      }
      if (!moving) Object.assign(current, target);
      render(current);
      return moving;
    }

    return function set(values = {}, instant = false) {
      Object.assign(target, values);
      if (instant) Object.assign(current, values);
      schedule(step);
    };
  }

  /**
   * Reveal on scroll (fires once)
   */
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-seen');
      entry.target.dispatchEvent(new CustomEvent('fx:seen'));
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  function reveal(el, onSeen) {
    if (onSeen) el.addEventListener('fx:seen', onSeen, { once: true });
    revealObserver.observe(el);
  }

  /**
   * Scroll progress bar
   */
  const progress = document.createElement('div');
  progress.className = 'fx-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    return false;
  }
  updateProgress();
  document.addEventListener('scroll', () => schedule(updateProgress), { passive: true });
  window.addEventListener('resize', updateProgress);

  /**
   * Hero: split the name into letters, scroll cue, network canvas, parallax
   */
  const hero = document.querySelector('#hero');
  if (hero) {
    const title = hero.querySelector('h2');
    const subtitle = hero.querySelector('p');

    if (title) heroTitle(title);

    const cue = document.createElement('a');
    cue.href = '#about';
    cue.className = 'fx-scroll-cue';
    cue.setAttribute('aria-label', 'Scroll to About');
    hero.appendChild(cue);

    if (!reduceMotion) {
      if (FX.network) heroNetwork(hero);
      heroParallax(hero, title, subtitle);
    }
  }

  function heroTitle(title) {
    const text = title.textContent.trim();
    const words = text.split(' ');
    title.setAttribute('aria-label', text);
    title.textContent = '';
    title.classList.add('fx-split');

    let index = 0;
    let lastChar = null;
    words.forEach((word, w) => {
      const wordEl = document.createElement('span');
      wordEl.className = 'fx-word';
      wordEl.setAttribute('aria-hidden', 'true');
      [...word].forEach(char => {
        lastChar = document.createElement('span');
        lastChar.className = 'fx-char';
        lastChar.style.setProperty('--i', index++);
        lastChar.textContent = char;
        wordEl.appendChild(lastChar);
      });
      title.appendChild(wordEl);
      if (w < words.length - 1) title.appendChild(document.createTextNode(' '));
    });

    // Glow wave once the last letter has landed
    if (lastChar && !reduceMotion) {
      lastChar.addEventListener('transitionend', function onLanded(e) {
        if (e.propertyName !== 'transform') return;
        lastChar.removeEventListener('transitionend', onLanded);
        title.classList.add('is-wave');
      });
    }

    ready.then(() => {
      // Force a style flush so the letters transition from their hidden state
      void title.offsetWidth;
      title.classList.add('is-in');
    });
  }

  function heroNetwork(hero) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.querySelector('.container'));
    const ctx = canvas.getContext('2d');

    const accent = getComputedStyle(hero).getPropertyValue('--accent-color').trim() || '#149ddd';
    const linkDist = 140;
    const pointer = { x: -9999, y: -9999 };
    let nodes = [];
    let width = 0;
    let height = 0;
    let running = false;
    let visible = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.round((width * height) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.8
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }
      ctx.strokeStyle = accent;
      for (let a = 0; a < nodes.length; a++) {
        const na = nodes[a];
        for (let b = a + 1; b < nodes.length; b++) {
          const nb = nodes[b];
          const d = Math.hypot(na.x - nb.x, na.y - nb.y);
          if (d < linkDist) {
            ctx.globalAlpha = (1 - d / linkDist) * 0.35;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
          }
        }
        // Nodes near the pointer reach out to it
        const dp = Math.hypot(na.x - pointer.x, na.y - pointer.y);
        if (dp < linkDist * 1.4) {
          ctx.globalAlpha = (1 - dp / (linkDist * 1.4)) * 0.7;
          ctx.beginPath();
          ctx.moveTo(na.x, na.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#ffffff';
      for (const n of nodes) {
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      if (!running) return;
      draw();
      requestAnimationFrame(loop);
    }

    function setRunning() {
      const shouldRun = visible && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        requestAnimationFrame(loop);
      } else if (!shouldRun) {
        running = false;
      }
    }

    resize();
    window.addEventListener('resize', resize);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setRunning();
    }).observe(hero);
    document.addEventListener('visibilitychange', setRunning);

    if (finePointer) {
      hero.addEventListener('pointermove', e => Object.assign(pointer, localPoint(hero, e)));
      hero.addEventListener('pointerleave', () => {
        pointer.x = pointer.y = -9999;
      });
    }

    ready.then(() => canvas.classList.add('is-on'));
  }

  function heroParallax(hero, title, subtitle) {
    const layers = [title, subtitle].filter(Boolean);
    if (!layers.length) return;

    // x/y: pointer offset from the hero centre (-0.5..0.5); scroll is read live
    const setTilt = follow({ x: 0, y: 0 }, 0.08, ({ x, y }) => {
      const scroll = Math.min(window.scrollY, hero.offsetHeight);
      const fade = 1 - scroll / hero.offsetHeight;
      layers.forEach((el, depth) => {
        const offset = (depth + 1) * 12;
        el.style.transform = `translate3d(${x * offset}px, ${y * offset + scroll * (0.25 + depth * 0.1)}px, 0)`;
        el.style.opacity = Math.max(fade, 0);
      });
    });

    if (finePointer) {
      hero.addEventListener('pointermove', e => {
        const p = localPoint(hero, e);
        setTilt({ x: p.x / p.width - 0.5, y: p.y / p.height - 0.5 });
      });
      hero.addEventListener('pointerleave', () => setTilt({ x: 0, y: 0 }));
    }
    document.addEventListener('scroll', () => {
      if (window.scrollY < hero.offsetHeight + 50) setTilt();
    }, { passive: true });
  }

  /**
   * Section titles and image reveals
   */
  document.querySelectorAll('.section-title').forEach(el => reveal(el));

  const portrait = document.querySelector('.about .col-lg-4 > img');
  if (portrait) {
    const wrap = document.createElement('div');
    wrap.className = 'fx-reveal';
    portrait.parentNode.insertBefore(wrap, portrait);
    wrap.appendChild(portrait);
    reveal(wrap);
  }

  document.querySelectorAll('.blog-details-area .entry-img').forEach(el => {
    el.classList.add('fx-reveal');
    reveal(el);
  });

  /**
   * Skill bars: fill with transform instead of width
   */
  document.querySelectorAll('.skills-content').forEach(group => {
    const bars = group.querySelectorAll('.progress-bar');
    bars.forEach((bar, i) => {
      bar.classList.add('fx-bar');
      bar.style.setProperty('--i', i);
      bar.style.width = bar.getAttribute('aria-valuenow') + '%';
    });
    reveal(group, () => bars.forEach(bar => bar.classList.add('is-filled')));
  });

  /**
   * Stats: pop the icon when its counter finishes
   */
  document.querySelectorAll('.stats .stats-item').forEach((item, i) => {
    const counter = item.querySelector('.purecounter');
    const seconds = parseFloat(counter && counter.dataset.purecounterDuration) || 1;
    reveal(item, () => setTimeout(() => item.classList.add('is-counted'), seconds * 1000 + i * 120));
  });

  /**
   * Pointer-only effects (mouse/trackpad, motion allowed)
   */
  if (pointerEffects) {
    cardEffects();
    magneticButtons();
    if (FX.cursor) cursorGlow();
  }

  function cardEffects() {
    // Spotlight that follows the pointer
    document.querySelectorAll('.blog .entry, .services .service-item').forEach(card => {
      card.classList.add('fx-spot');
      card.addEventListener('pointermove', e => {
        const p = localPoint(card, e);
        card.style.setProperty('--mx', `${p.x}px`);
        card.style.setProperty('--my', `${p.y}px`);
      });
    });

    // 3D tilt toward the pointer
    document.querySelectorAll('.blog .entry').forEach(card => {
      card.classList.add('fx-tilt');
      const setTilt = follow({ rx: 0, ry: 0, lift: 0 }, 0.12, ({ rx, ry, lift }) => {
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(${lift}px)`;
      });
      card.addEventListener('pointermove', e => {
        const p = localPoint(card, e);
        setTilt({ rx: -(p.y / p.height - 0.5) * 8, ry: (p.x / p.width - 0.5) * 8, lift: -6 });
      });
      card.addEventListener('pointerleave', () => setTilt({ rx: 0, ry: 0, lift: 0 }));
    });
  }

  function magneticButtons() {
    document.querySelectorAll('.contact .php-email-form button[type="submit"], .read-more-btn, .scroll-top, .btn').forEach(btn => {
      btn.classList.add('fx-magnet');
      // x/y: pull toward the pointer; scale: press feedback
      const setPull = follow({ x: 0, y: 0, scale: 1 }, 0.2, ({ x, y, scale }) => {
        btn.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      });
      btn.addEventListener('pointermove', e => {
        const p = localPoint(btn, e);
        setPull({ x: (p.x - p.width / 2) * 0.3, y: (p.y - p.height / 2) * 0.3 });
      });
      btn.addEventListener('pointerleave', () => setPull({ x: 0, y: 0, scale: 1 }));
      btn.addEventListener('pointerdown', () => setPull({ scale: 0.97 }));
      btn.addEventListener('pointerup', () => setPull({ scale: 1 }));
    });
  }

  function cursorGlow() {
    const cursor = document.createElement('div');
    cursor.className = 'fx-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    const setRing = follow({ x: -100, y: -100 }, 0.2, ({ x, y }) => {
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    document.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const appearing = !cursor.classList.contains('is-visible');
      cursor.classList.add('is-visible');
      // Jump to the pointer when it first appears instead of sliding in
      setRing({ x: e.clientX, y: e.clientY }, appearing);
    });
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    document.addEventListener('pointerover', e => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .entry, .service-item, input, textarea'));
    });
  }

})();
