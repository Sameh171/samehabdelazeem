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

- `index.html` — the single-page homepage. Sections, in order: `#hero`, focus-area cards, `#about` (contains `#digital-transformation`), `#training`, `#business-development`, `#technology-sales`, `#salestack`, `#insights`, `#contact`. Hidden legacy anchors `#blog`, `#services`, `#skills` keep old links working. Each section has `data-nav="<nav target id>"`, which `main.js` uses for scrollspy (e.g. `#salestack` highlights "Technology Sales").
- `blogs/*.html` — article pages, one directory down, so asset/nav paths use `../` (never prefix absolute URLs). Each carries its own SEO block (title, description, canonical, Open Graph, Twitter card, `BlogPosting` JSON-LD). New posts must also be added as a card in `#insights` in `index.html`. They share the homepage header/footer markup — keep them in sync when the nav changes.
- `service-details.html` — legacy URL only: a `noindex` redirect that maps old `#hash` tabs to homepage sections.
- `assets/css/main.css` — all styling. Colours/fonts are tokens on `:root` (`--navy-*`, `--lime`, `--lime-ink` for lime-family text on white, `--font-heading` Sora, `--font-body` Inter). Section variants: `.section--gray`, `.section--navy`.
- `assets/js/main.js` — header/mobile nav, scrollspy, reveal-on-scroll (`.reveal` → `.is-visible`, skipped under reduced motion), back-to-top, `a[data-subject]` contact-subject prefill, footer year, and the contact form.
- `assets/img/` — `hero-portrait*.jpg` (real photo of Sameh, 4:5 crops), `og-image.jpg` (1200×630 social card), `blogs/*.jpg` (article illustrations), `Logo2.png` (favicon/email logo).
- Only files that some page references are kept. Don't add vendor libraries, build variants or placeholder images that nothing loads.
- Icons are Bootstrap Icons (`bi bi-*`) only.

## Content rules

- Personal brand, independent of any employer: no employer names, logos, addresses, emails, client testimonials or company case studies.
- Don't invent statistics, testimonials, courses, prices, dates or outcomes. SaleStack has no public page yet — don't link to one until it exists.

## Contact form

`main.js` intercepts `#contact-form` submit and POSTs JSON (`to`, `subject`, `text`, `html`) to a Cloudflare Worker at `https://resend-worker.sameh-232.workers.dev/sendEmail` (Resend-backed), which emails a confirmation to the submitter. User input is HTML-escaped before going into the email HTML. Status is shown in `.form-status` (`data-state` = loading/success/error). There is no server-side form handler in this repo.

## Cache busting

Pages load `main.css` and `main.js` with a `?v=YYYY-MM-DD` query so browsers and CDNs don't serve a stale copy after a deploy. Bump the version on every page whenever either file changes.
