# Yaspieze - official site

The website for **Yaspieze** (Yaspz), a nerdcore artist who writes songs about animation and horror games.

Hand-written HTML and CSS. No framework, no build step, no dependencies at runtime, no analytics, no cookie banner.

---

## Pages

Clean URLs, no `.html` on the end - every page is a folder with an `index.html` inside it, which is how static hosts serve `/about/` instead of `/about.html`.

| URL | File | What it is |
| --- | --- | --- |
| `/` | `index.html` | Banner, introduction, and the sections with character art |
| `/about/` | `about/index.html` | Who Yaspieze is, what the music is made from, how it's made |
| `/listen/` | `listen/index.html` | Where the music lives, and what isn't there |
| `/collaborators/` | `collaborators/index.html` | The artists featured on the channel |
| `/contact/` | `contact/index.html` | Discord ID with a copy button, and what to send |
| `/merch/` | `merch/index.html` | The store: five shirts and hoodies, working cart |
| `/figure/` | `figure/index.html` | The action figure, its box, and every camera angle. Marked in production |
| `/404.html` | `404.html` | Not-found page |

Links are relative (`about/`, `../listen/`), so the site works at a domain root and in a GitHub Pages project subfolder without edits. The one exception is `404.html`, which uses root-absolute links (`/about/`) because the server can serve it from any depth - if you host under a subfolder rather than a domain root, change those five links.

---

## Repository layout

```
.
├── index.html               Home
├── 404.html                 Not-found page
├── merch/index.html
├── figure/index.html
├── about/index.html
├── listen/index.html
├── collaborators/index.html
├── contact/index.html
├── assets/
│   ├── brand/
│   │   ├── yaspieze-wordmark.svg        Outlines, transparent, uses currentColor
│   │   ├── yaspieze-wordmark-dark.png   Transparent PNG, plum to magenta
│   │   └── yaspieze-wordmark-light.png  Transparent PNG, white
│   └── img/
│       ├── banner-upscaled.webp      Banner, upscaled 2× (5120 × 848)
│       ├── avatar-upscaled.webp      Profile picture, upscaled 2× (1800 × 1800)
│       ├── banner.webp               Banner sized for the web (1600 × 265)
│       ├── avatar.webp               Profile picture sized for the web
│       ├── character-*.webp          Character art, transparent background
│       ├── crew1–5.webp              Collaborator avatars
│       └── app-icon.png              Home-screen icon
├── manifest.webmanifest
├── robots.txt
├── sitemap.xml
├── humans.txt
├── .nojekyll
├── .github/workflows/pages.yml
├── LICENSE
└── README.md
```

Each HTML page is self-contained: the stylesheet, the script and every image it needs are inlined into the file. That is deliberate. It means one request per page, nothing to break when a path changes, and a page that still renders correctly if it is saved and opened offline. The files in `assets/img/` are the originals - the upscales and the plain character art - kept so they can be reused or re-exported later. They are not referenced by the pages.

Because everything is inlined, the home page is about 530 KB and the inner pages are 190–240 KB. If that ever needs to come down, the quickest route is to point the `<img>` tags at `assets/img/` and load one external stylesheet instead of six copies.

---

## Local preview

Do not open the files directly from disk - `about/` style links need a server to resolve.

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Any static server works: `npx serve`, `php -S localhost:8000`, Live Server in an editor.

---

## Deployment

### GitHub Pages, with the workflow in this repository

1. Push the repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Every push to `main` then publishes the site. The workflow is in `.github/workflows/pages.yml`.

### GitHub Pages, without Actions

**Settings → Pages → Deploy from a branch → main → / (root)**, then save. `index.html` at the root is the home page, and the folder-per-page layout gives clean URLs.

### Custom domain

Add a file called `CNAME` at the repository root containing the bare domain (`yaspieze.com`, no `https://`, no trailing slash), then add the DNS records GitHub lists under **Settings → Pages**. Nothing in the HTML needs to change.

### Netlify, Cloudflare Pages, Vercel

Point them at the repository root. No build command, no publish directory, no redirects needed - folder `index.html` files resolve to clean URLs on all three.

---

## Changing the site

**Copy** is plain HTML inside each page's `<main>`. Search for the sentence. Keep the voice first-person and plain: no counts, no discography, no claims the artist hasn't made.

**Colours and type** live in the `:root` block at the top of the `<style>` in every page. Because the stylesheet is inlined, a token change has to be applied to all six files. The palette is taken from the profile picture and the channel banner:

| Token | Value | Where it comes from |
| --- | --- | --- |
| `--ink` | `#241a2d` | the black shirt, warmed to a plum |
| `--magenta` | `#b8338f` | the banner background |
| `--pink` | `#e6479f` / `#c92683` | the hair tips |
| `--purple` | `#7a41b5` | the butterfly wings |
| `--lav` | `#b18ae2` | the feather tufts and hair highlight |
| `--cream` | `#ffe6d8` | the skin tone, used as the warm accent in the background field |

**Images** are inlined as base64 in each page. To swap art:

```bash
# 1. put the new file in assets/img/
# 2. rebuild the data URI and paste it over the old src
python3 -c "import base64,sys;print('data:image/webp;base64,'+base64.b64encode(open('assets/img/new.webp','rb').read()).decode())"
```

The Discord ID appears twice in `contact/index.html` and the home page: as text in the tile, and in the copy handler (`var id = 'yappieze';`). Change both.

**Nav labels** are repeated in three places per page: the header links, the mobile tab bar, and the `aria-current="page"` marker on the current page.

---

## The shop

`/merch/` is a real cart, not a mock-up. It keeps its own state in
`localStorage` under `yaspieze-cart-v1`, survives a reload, follows the
customer between pages, and shows the same basket in the header on every
page. Everything else is deliberately plain HTML: the products are static
markup, and the JavaScript only adds, removes and totals.

How an order finishes depends on one line, near the top of the cart block
in the page source:

```js
var PAYMENT_URL = '';   // paste a Stripe Payment Link, Gumroad, Shopify or similar
```

- **Empty (what ships now).** The checkout button builds an order summary
  with a reference, a copy button, and a link to the contact page. Nothing
  is charged, nothing is sent anywhere by itself. The customer copies the
  order and sends it over Discord, and you reply with postage and a payment
  link. That is honest, and it works today with no account anywhere.
- **Set.** The button sends the customer to that URL with the basket
  appended as `?items=tee-blk:M:2,...` so a real processor can pick it up.

Prices live in the `CATALOGUE` object in the same block, in pence
(`2400` is £24.00). Sizes are plain buttons in the markup: adding or
removing one is a matter of adding or removing a `<button data-size>`.

To take an item off sale, delete its `<article class="product">` block. To
add one, copy a block, change the name, the price and the `data-add` key,
and add the same key to `CATALOGUE`.

The action figure is not in the catalogue. Its page is marked in production
in the markup (`fig-status`) and it has no add-to-cart button, so there is
nothing to disable when the first run sells out.

## The figure images

`/figure/` shows five square shots at 1200 px wide, inlined like every other
image on the site, and each one links to a 2048 x 2048 master in
`assets/img/figure/`. Those masters are the files to use for prints, the
channel, or anywhere the figure gets shown large. They are separate files
rather than inlined because six 2048 px photographs on one page is a lot to
download for a phone.

## The wordmark

YASPIEZE is set as outlines, not as text: the letterforms come from the same Inter variable font the pages use, instanced at weight 850, converted to vector paths and tightened to -0.035em tracking. That gives a mark that is crisp at any size, has a genuinely transparent background, and renders identically whether or not the font loads.

On the site it appears twice per page: a small ink version in the navigation, and the large gradient version in the home page hero. Both are inline SVG, so they cost a few kilobytes and nothing else.

Three standalone copies live in `assets/brand/` for everything off the site (social headers, video thumbnails, printed stickers):

| File | Use |
| --- | --- |
| `yaspieze-wordmark.svg` | Vector, transparent, inherits `currentColor` |
| `yaspieze-wordmark-dark.png` | 1600 px wide, transparent, plum to magenta gradient |
| `yaspieze-wordmark-light.png` | 1600 px wide, transparent, pure white for dark backgrounds |

The generator is `dev/make_wordmark.py` in the workspace outside this repository. Change `WEIGHT` or `TRACKING` at the top and run it to rebuild both the SVG path and the PNGs.

---

## The images

- `banner-upscaled.webp` and `avatar-upscaled.webp` are 2× Lanczos resamples with a light unsharp pass. Nothing was redrawn or generated - the pixels that were there are the pixels that are there, just twice the size. A neural upscaler would have invented detail, which is the one thing that shouldn't happen to someone's own artwork.
- The character illustrations are cut from flat-lavender artwork with a flood fill seeded only from background-coloured border pixels, then given a hard alpha with a half-pixel feather. Hard alpha matters: a soft colour threshold eats the white in her eyes and the highlights in her hair, which is exactly what went wrong on the first pass. One image also had her shirt filled in because a border seed landed on the character, not on the background.
- The illustrations were generated to match the character in the banner and profile picture - same hair, feathers, wings, shirt, choker and headphones. They exist so the layout has a figure in each section. If real art of the character is ever drawn, drop it in at the same size (`assets/img/character-*.webp`) and rebuild the inline copy.
- The collaborator avatars are the channels' own profile pictures, shown as circles with a white ring.

---

## Accessibility

- Every page has a skip link, a single `h1`, and semantic landmarks.
- The current page is marked with `aria-current="page"` in both the header nav and the mobile tab bar.
- The copy button announces its result through a live region, and changes its own label to "Copied" for two seconds.
- Images that carry meaning have alt text; collaborator avatars are labelled by their link text.
- Focus is always visible, and every interactive target is at least 44 px.
- Motion - reveals, smooth scrolling - is disabled under `prefers-reduced-motion: reduce`.
- With JavaScript off, the site still navigates and reads; only the scroll easing and the copy button change behaviour.
- A print stylesheet drops the background, navigation and banner, and prints black on white with URLs after links.

---

## Performance notes

- One request per page; no external fonts, scripts or stylesheets.
- The background is four CSS radial gradients, no `filter: blur()` layers. That single change took scroll frames from a 150 ms 95th percentile to 16.7 ms, because the old blurred shapes were being recomposited on every frame. Cards, nav and tab bar use `backdrop-filter` on small surfaces, measured at frame rate.
- The desktop scroll easing runs on one `requestAnimationFrame` loop that reads no layout and stops the moment it catches up, so an idle page costs nothing.
- That loop is the only thing allowed to animate scrolling. `html.js-scroll` sets `scroll-behavior: auto`, so the browser's own smooth animation is switched off while the script drives it and the two never fight. Anchors, the keyboard, the scrollbar and trackpad gestures all hand control straight back to the browser.
- Blurred background shapes are painted once and never animated, only composited.

---

## Support

Current Chrome, Edge, Firefox and Safari (16+). Uses CSS custom properties, `clamp()`, `backdrop-filter`, `env(safe-area-inset-*)`, and `IntersectionObserver`. Older browsers get the same content with flatter surfaces.

---

## Legal

Copyright © 2026 Yaspieze. All rights reserved. See `LICENSE`.

The channel banner, profile picture and collaborator avatars belong to their respective owners and are used here to represent their work. Poppy Playtime, Bendy and the Ink Machine, The Amazing Digital Circus, Verity and Minecraft are the property of their respective owners; this is a fan-facing artist profile and is not affiliated with any of them. YouTube is a trademark of Google LLC.

Type is the Apple system stack, falling back to Inter, which is embedded under the SIL Open Font License 1.1.

---

## Before publishing

- [ ] Replace `https://yaspieze.github.io/` in `sitemap.xml` and `robots.txt` with the real domain
- [ ] Add a `CNAME` file if a custom domain is used
- [ ] Confirm every collaborator handle still resolves
- [ ] Update the copyright year in the footer when it rolls over
- [ ] Decide what the shop does at checkout: paste a `PAYMENT_URL`, or leave it empty and send orders through Discord
- [ ] Check the prices in `CATALOGUE` against what the printer actually charges
- [ ] When the figure goes on sale, add it to `CATALOGUE`, give it a product block on `/merch/`, and change the `fig-status` pill on `/figure/` from in production to available
- [ ] Check the site at 390, 768 and 1440 px after any copy change
- [ ] If the wordmark changes, replace the inline path in every page and the three files in `assets/brand/`
