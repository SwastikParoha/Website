# Contemprory website

A one-page site for Contemprory skincare. The hero is a live 3D model of the
Blue PDRN Face Serum, built in code with three.js (no 3D files, no paid
generators). Scrolling moves the camera around it through five story beats,
and the Explore section lets visitors drag to spin it and switch the light.

## Run it

```bash
cd website
npm install
npm run dev                      # http://localhost:5173
npm run build -- --base=./       # static site in website/dist
npx vite preview                 # check the build over HTTP
```

Always preview over HTTP, never by opening `dist/index.html` as a file.

## Where things live

| File | What it is |
|---|---|
| `index.html` | all page copy and sections |
| `src/style.css` | brand colors (top of file), layout, phone styles |
| `src/main.js` | smooth scroll, reveals, the camera beats, hotspots, light modes |
| `src/stage.js` | the 3D scene: lights, water, ripples, drops, camera, drag-to-spin |
| `src/bottle.js` | the serum bottle and the serum drops, modelled in code |
| `src/particles.js` | the rising dew |
| `inspect.html` | dev-only page: the bottle from four angles (`/inspect.html?bg=light`) |
| `public/img/` | photos cropped from the current contemprory.com, plus `hero.jpg` (the poster) |
| `public/fonts/` | Bricolage Grotesque and DM Sans, self-hosted |

## Before launch: replace the placeholders

- **Contact details** in the footer: `hello@contemprory.com`,
  `+91 00000 00000` and the Instagram link are placeholders.
- **Shop links**: every "Buy now" / "Shop" button points to
  `https://www.contemprory.com/`. Swap in each product's real page URL.
- **Photos**: the images in `public/img/` were cropped from screenshots of the
  current site, so they are lower resolution than the originals. Replace them
  with the original photo files (same file names) for sharp results on big
  screens.

## The question form

"Not sure where to start?" in the footer does not send anything yet. With
placeholder contact details it only shows a thank-you message on the page, so
**visitor messages currently go nowhere**. To receive them, either:

- point it at your inbox: in `src/main.js`, replace the submit handler with a
  `mailto:` link to your real email, or
- connect a form service (Formspree, Web3Forms, Hostinger's form tools) and
  post the form there.
