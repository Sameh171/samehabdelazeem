# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static personal/consulting portfolio site for samehabdelazeem.com, built on the BootstrapMade "iPortfolio"-style template (Bootstrap 5.3.3). Plain HTML/CSS/vanilla JS — there is no package manager, build step, bundler, linter, or test suite. All third-party libraries are vendored under `assets/vendor/`. SCSS sources are not included (pro-version only), so edit `assets/css/main.css` directly.

## Running locally

Serve the repo root with any static server, e.g.:

```
python -m http.server 8000
```

Then open http://localhost:8000/. Opening files via `file://` mostly works, but a server is closer to production.

## Structure

- `index.html` — the main single-page site. Sections are anchored by id (`#hero`, `#about`, `#stats`, `#skills`, `#blog`, `#services`, `#testimonials`, `#contact`; `#resume` is commented out). The left sidebar nav links to these anchors and `main.js` scrollspy highlights the active one.
- `blogs/*.html` — standalone blog post pages. They live one directory down, so every asset/nav path must be prefixed with `../` (e.g. `../assets/css/main.css`, `../index.html#contact`). Each page carries its own SEO block (title, description, canonical, Open Graph, Twitter card, `BlogPosting` JSON-LD). New posts must also be added as a card in the `#blog` section of `index.html`.
- `service-details.html` — secondary page at the root (linked from the Services cards).
- Only files that some page references are kept; unused template/vendor files were deleted. Don't add vendor build variants or placeholder images that nothing loads.
- `assets/css/main.css` — all custom styling. Theme colors/fonts are CSS variables at the top (`--accent-color`, `--heading-font`, etc.); `.light-background` / `.dark-background` section classes override them. Blog styles are under `.blog` (index cards) and `.blog-details-area` (post pages).
- `assets/js/main.js` — template behavior: mobile header toggle, preloader, scroll-top, AOS, Typed.js (reads `data-typed-items` on `.typed`), PureCounter, Waypoints-driven skill bars, GLightbox, Isotope filters, and Swiper (config read from a `<script type="application/json" class="swiper-config">` inside each `.init-swiper`).
- `assets/css/effects.css` / `assets/js/effects.js` — custom motion layer (loader, hero intro, reveals, tilt, etc.), loaded on every page after `main.js`. The header comment in `effects.js` lists the markup contract (loader markup first in `<body>`, plain-text `#hero h2`, no `.skills-animation` class). Effects can be switched off with the `FX` flags at the top of `effects.js`; the loader markup is duplicated in each page so it paints before JS runs.
- Icons are Bootstrap Icons (`bi bi-*`) only — Font Awesome was removed; don't reintroduce `fa-*` icons.

## Contact form

An inline `<script>` near the bottom of `index.html` intercepts `#contact-form` submit and POSTs JSON (`to`, `subject`, `text`, `html`) to a Cloudflare Worker at `https://resend-worker.sameh-232.workers.dev/sendEmail` (Resend-backed), which sends a confirmation email to the submitter. It toggles the `.loading`, `.sent-message`, and `.error-message` elements. There is no server-side form handler in this repo.

## Known quirks

- When copying `../` asset paths into blog pages, don't apply the prefix to absolute URLs (this previously broke the Google Fonts links).
- Some blog share links still point at placeholder `yourdomain.com` URLs.
- Blog image filenames contain spaces (`WhatsApp Image ...jpg`); keep paths quoted/encoded correctly when referencing them.
