# PD_001

Personal site of Prasang Das: an interactive ASCII portfolio for physics, computation and intelligence.

A custom Canvas 2D renderer draws the page's visuals as characters; all portfolio content is real HTML.

## Develop

```bash
npm install
npm run dev
```

## Portrait

`public/assets/portrait.png` is generated from a photo, never committed in raw form:

```bash
uv run scripts/prepare_portrait.py photo.jpg public/assets/portrait.png \
  --crop x0,y0,x1,y1 --exclude "x,y x,y ..." --fade CX,CY,RX,RY
```

It removes the background, regrades for character resolution and packs luminance (R), rim light (G) and mask (A).

## Layout

- `src/ascii/`: renderer, character mapping, image sampling
- `src/scenes/`: scenes the renderer draws (portrait, procedural fallback)
- `src/data/`: profile, projects, research areas, timeline
