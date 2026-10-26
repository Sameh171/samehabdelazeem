# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static personal-brand site for samehabdelazeem.com (Sameh Abdelazeem — technology leadership, business development, technology sales, training). Plain HTML/CSS/vanilla JS — there is no package manager, build step, bundler, linter, or test suite. Bootstrap 5.3.3 CSS (reboot, grid, utilities) and Bootstrap Icons are vendored under `assets/vendor/`; no other third-party JS is loaded.

## Running locally

Serve the repo root with any static server, e.g.:

```
python -m http.server 8000
```

Then open http://localhost:8000/.

## Structure

- `index.html` — homepage: `#hero`, focus-area cards, marquee band, `#about`, `#insights`, `#contact`. Each section has `data-nav="<nav target id>"`, which `main.js` uses for scrollspy. A small inline script in `<head>` forwards old anchors (`#training`, `#business-development`, `#technology-sales`, `#digital-transformation`, `#salestack`, `#services`, `#skills`) to the topic pages.
- Topic pages at the root: `digital-transformation.html`, `training.html`, `business-development.html`, `technology-sales.html`. The focus cards and the main nav link to them. Each has a `.page-hero`, its content sections, an "Other areas" block (`.explore`) and a `.cta-band` linking to `index.html?subject=...#contact`.
- `blogs/*.html` — article pages, one directory down, so asset/nav paths use `../` (never prefix absolute URLs). Each carries its own SEO block (title, description, canonical, Open Graph, Twitter card, `BlogPosting` JSON-LD). New posts must also be added as a card in `#insights` in `index.html`.
- Every page repeats the same loader, header and footer markup — keep them in sync when the nav changes. The loader must stay the first element in `<body>` so it paints before anything else.
- `service-details.html` — legacy URL only: a `noindex` redirect that maps old `#hash` tabs to the topic pages.
- `assets/css/main.css` — all styling. Colours/fonts are tokens on `:root` (`--navy-*`, `--lime`, `--lime-ink` for lime-family text on white, `--font-heading` Sora, `--font-body` Inter). Section variants: `.section--gray`, `.section--navy`.
- `assets/js/main.js` — loader, page transitions, header/mobile nav, scrollspy, scroll progress, reveal-on-scroll, count-up numbers, card spotlight/tilt, magnetic buttons, back-to-top, contact-subject prefill (`a[data-subject]` or `?subject=`), footer year, and the contact form.
- `assets/img/` — `hero-portrait*.jpg` (real photo of Sameh, 4:5 crops), `og-image.jpg` (1200×630 social card), `blogs/*.jpg` (article illustrations), `Logo2.png` (favicon/email logo).
- Only files that some page references are kept. Don't add vendor libraries, build variants or placeholder images that nothing loads.
- Icons are Bootstrap Icons (`bi bi-*`) only.

## Motion

- `main.js` adds `html.fx`; every hidden start state in `main.css` is scoped to `.fx`, so if JS fails the page is simply static. The loader also has a CSS failsafe that hides it after 6s.
- `html.is-loaded` is set when the loader lifts; `[data-intro]` elements then play in document order, and `[data-split]` headings are split into words (`.w > span`).
- `.reveal` elements animate in on scroll (`data-reveal="left|right|zoom"` for direction); siblings are staggered automatically.
- All motion is disabled under `prefers-reduced-motion`.

## Content rules

- Personal brand, independent of any employer: no employer names, logos, addresses, emails, client testimonials or company case studies.
- Don't invent statistics, testimonials, courses, prices, dates or outcomes. The SaleStack section was removed at the owner's request; don't reintroduce it unless asked.

## Contact form

`main.js` intercepts `#contact-form` submit and POSTs JSON (`to`, `subject`, `text`, `html`) to a Cloudflare Worker at `https://resend-worker.sameh-232.workers.dev/sendEmail` (Resend-backed), which emails a confirmation to the submitter. User input is HTML-escaped before going into the email HTML. Status is shown in `.form-status` (`data-state` = loading/success/error). There is no server-side form handler in this repo.

## Cache busting

Pages load `main.css` and `main.js` with a `?v=YYYY-MM-DD` query so browsers and CDNs don't serve a stale copy after a deploy. Bump the version on every page whenever either file changes.
