# /// script
# requires-python = ">=3.10"
# dependencies = ["rembg[cpu]", "pillow", "numpy"]
# ///
"""
Turn a photo into the portrait asset the ASCII renderer samples.

    uv run scripts/prepare_portrait.py photo.jpg public/assets/portrait.png

Output channels: R = graded luminance, G = rim light, A = subject mask.
The original photo never needs to be committed; only the output is.
"""

import argparse

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import new_session, remove


def blur(a: np.ndarray, radius: float) -> np.ndarray:
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255


def parse_box(s: str) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = (int(v) for v in s.split(","))
    return x0, y0, x1, y1


def parse_polygon(s: str) -> list[tuple[int, int]]:
    return [tuple(int(v) for v in pt.split(",")) for pt in s.split()]  # type: ignore[misc]


def polygon_mask(size: tuple[int, int], polys: list[list[tuple[int, int]]],
                 offset: tuple[int, int]) -> np.ndarray:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for poly in polys:
        draw.polygon([(x - offset[0], y - offset[1]) for x, y in poly], fill=255)
    return np.asarray(mask, dtype=np.float32) / 255


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--top", type=float, default=0.2, help="crop from this fraction of height")
    p.add_argument("--width", type=int, default=480)
    p.add_argument("--clear-above", type=float, default=0.3,
                   help="drop bright specks (e.g. fairy lights) above this fraction of height")
    p.add_argument("--crop", type=parse_box, help="x0,y0,x1,y1 in source pixels")
    p.add_argument("--model", default="isnet-general-use",
                   help="rembg model, e.g. u2net_human_seg for people in dark clothing")
    p.add_argument("--exclude", type=parse_polygon, action="append", default=[],
                   help='polygon "x,y x,y ..." in source pixels to remove (e.g. other people)')
    p.add_argument("--darken", type=parse_polygon, action="append", default=[],
                   help="polygon in source pixels to keep in the mask but render as shadow")
    p.add_argument("--fade", type=lambda v: tuple(float(x) for x in v.split(",")),
                   metavar="CX,CY,RX,RY",
                   help="dissolve the subject outside an ellipse (fractions of the cropped "
                        "frame), so the body melts away instead of ending at the crop edge")
    args = p.parse_args()

    photo = Image.open(args.src).convert("RGB")
    # Segment the full frame (the model needs context), then crop.
    cut = remove(photo, session=new_session(args.model), alpha_matting=True)
    offset = (0, 0)
    if args.crop:
        cut = cut.crop(args.crop)
        offset = args.crop[:2]
    rgba = np.asarray(cut, dtype=np.float32) / 255
    h, w = rgba.shape[:2]

    luma = rgba[..., 0] * 0.2126 + rgba[..., 1] * 0.7152 + rgba[..., 2] * 0.0722
    alpha = rgba[..., 3].copy()
    excluded = np.zeros((h, w), dtype=np.float32)
    if args.exclude:
        excluded = blur(polygon_mask((w, h), args.exclude, offset), 8)
    if args.darken:
        dark = blur(polygon_mask((w, h), args.darken, offset), 3)
        luma = luma * (1 - dark) + np.percentile(luma[alpha > 0.5], 5) * dark

    # Stray highlights caught in the mask near the top of the hair.
    ys = np.arange(h)[:, None] < h * args.clear_above
    alpha[ys & (luma > 0.6)] = 0
    alpha = blur(alpha, 1.2)

    # Auto-levels within the subject, then local contrast so features read
    # at character resolution.
    inside = alpha * (1 - excluded) > 0.5
    lo, hi = np.percentile(luma[inside], [1, 99.8])
    g = np.clip((blur(luma, 1.5) - lo) / (hi - lo), 0, 1)
    g = np.clip(g + (g - blur(g, 18)) * 0.7, 0, 1)
    g = np.clip(g + (g - blur(g, 3)) * 0.5, 0, 1)
    g = g ** 1.25

    # Rim light along the silhouette, stronger on the right.
    # Rim from the true silhouette only, so excluded regions don't get an outline.
    rim = np.clip((alpha - blur(alpha, 10)) * 3.2, 0, 1) * (1 - excluded)
    alpha *= 1 - excluded
    xs = np.linspace(0, 1, w)[None, :]
    rim *= 0.45 + 0.55 * xs

    # Dark hair would vanish against the background; give the whole
    # subject a floor so the silhouette survives.
    lum = np.clip(0.17 + 0.83 * g, 0, 1) * (alpha > 0.02)

    if args.fade:
        cx, cy, rx, ry = args.fade
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.hypot((xx / w - cx) / rx, (yy / h - cy) / ry)
        # Noisy threshold so the edge scatters into particles rather than a smooth gradient.
        noise = np.random.default_rng(7).random((h, w)).astype(np.float32)
        noise = blur(noise, 1.5) - 0.5
        v = np.clip((1.0 - d) / 0.4 + noise * 1.6, 0, 1)
        alpha *= v
        rim *= v

    out = np.zeros((h, w, 4), dtype=np.float32)
    out[..., 0] = lum
    out[..., 1] = rim
    out[..., 3] = alpha
    img = Image.fromarray((out * 255).astype(np.uint8), "RGBA")

    top = int(h * args.top)
    img = img.crop((0, top, w, h))
    ratio = args.width / img.width
    img = img.resize((args.width, round(img.height * ratio)), Image.Resampling.LANCZOS)
    img.save(args.dst, optimize=True)
    print(f"wrote {args.dst} {img.size}")


if __name__ == "__main__":
    main()
