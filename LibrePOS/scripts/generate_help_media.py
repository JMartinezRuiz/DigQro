#!/usr/bin/env python3
"""Compose readable offline tutorials from real LibrePOS screenshots.

Optional focus rectangles use source pixels: [left, top, width, height].
They crop and highlight the actual interface; they never recreate controls.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT / "src" / "help-content.json"
SOURCE_DIR = ROOT / "assets" / "help" / "source"
MANIFEST_PATH = SOURCE_DIR / "manifest.json"
OUTPUT_DIR = ROOT / "assets" / "help"

WIDTH, HEIGHT = 1280, 800
SCREENSHOT_SIZE = (1216, 592)
SCREENSHOT_ORIGIN = (32, 164)
COLORS = {
    "ink": "#142F35", "muted": "#52666B", "paper": "#EDF3F2",
    "teal": "#146B5C", "white": "#FFFFFF", "border": "#CDDBD7",
    "highlight": "#D17720", "track": "#CDDBD7",
}

FONT_REGULAR_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/SFNS.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
FONT_BOLD_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/SFNS.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in FONT_BOLD_CANDIDATES if bold else FONT_REGULAR_CANDIDATES:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


FONT_SMALL = load_font(17)
FONT_SMALL_BOLD = load_font(17, True)
FONT_CAPTION = load_font(30, True)
FONT_STEP = load_font(26, True)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    """Wrap without silently losing words; reject overlong individual words."""
    lines: list[str] = []
    line = ""
    for word in str(text).split():
        if draw.textlength(word, font=font) > max_width:
            raise ValueError(f"Palabra demasiado larga para el tutorial: {word}")
        candidate = f"{line} {word}".strip()
        if line and draw.textlength(candidate, font=font) > max_width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def focused_crop(image: Image.Image, focus: list[int] | None) -> tuple[Image.Image, tuple[int, int]]:
    if not focus:
        return image, (0, 0)
    x, y, width, height = focus
    # Leave contextual space around the real target and preserve its full bounds.
    crop_width = min(image.width, max(width + 80, 640))
    crop_height = min(image.height, max(height + 70, crop_width * SCREENSHOT_SIZE[1] / SCREENSHOT_SIZE[0]))
    crop_width = min(image.width, max(crop_width, crop_height * SCREENSHOT_SIZE[0] / SCREENSHOT_SIZE[1]))
    left = max(0, min(image.width - crop_width, x + width / 2 - crop_width / 2))
    top = max(0, min(image.height - crop_height, y + height / 2 - crop_height / 2))
    box = (int(left), int(top), int(left + crop_width), int(top + crop_height))
    return image.crop(box), (box[0], box[1])


def render_frame(frame: dict, index: int, total: int, capture_version: str) -> Image.Image:
    with Image.open(SOURCE_DIR / frame["image"]) as source:
        screenshot = source.convert("RGB")
    if screenshot.width < 1000 or screenshot.height < 600:
        raise ValueError(f"Captura demasiado pequeña: {frame['image']}")
    canvas = Image.new("RGB", (WIDTH, HEIGHT), COLORS["paper"])
    draw = ImageDraw.Draw(canvas)
    draw.text((32, 22), "LIBREPOS  /  GUÍA PASO A PASO", font=FONT_SMALL_BOLD, fill=COLORS["teal"])
    version_label = f"Captura real · v{frame.get('captureVersion', capture_version)}"
    draw.text((WIDTH - 32 - draw.textlength(version_label, font=FONT_SMALL), 22), version_label,
              font=FONT_SMALL, fill=COLORS["muted"])
    draw.rounded_rectangle((32, 59, 122, 139), radius=16, fill=COLORS["teal"])
    step_label = f"{index + 1:02d}"
    draw.text((77 - draw.textlength(step_label, font=FONT_STEP) / 2, 71), step_label,
              font=FONT_STEP, fill=COLORS["white"])
    count_label = f"de {total}"
    draw.text((77 - draw.textlength(count_label, font=FONT_SMALL) / 2, 109), count_label,
              font=FONT_SMALL, fill=COLORS["white"])
    caption_lines = wrap_text(draw, frame["caption"], FONT_CAPTION, WIDTH - 182)
    if len(caption_lines) > 2:
        raise ValueError(f"Divide el paso en dos: el texto supera dos líneas legibles: {frame['caption']}")
    caption_y = 70 if len(caption_lines) == 2 else 89
    for line in caption_lines:
        draw.text((148, caption_y), line, font=FONT_CAPTION, fill=COLORS["ink"])
        caption_y += 38

    focus = frame.get("focus")
    crop, origin = focused_crop(screenshot, focus)
    fitted = ImageOps.contain(crop, SCREENSHOT_SIZE, method=Image.Resampling.LANCZOS)
    pos = (SCREENSHOT_ORIGIN[0] + (SCREENSHOT_SIZE[0] - fitted.width) // 2,
           SCREENSHOT_ORIGIN[1] + (SCREENSHOT_SIZE[1] - fitted.height) // 2)
    draw.rounded_rectangle((31, 163, 1249, 757), radius=12, fill=COLORS["white"], outline=COLORS["border"])
    canvas.paste(fitted, pos)
    if focus:
        scale_x, scale_y = fitted.width / crop.width, fitted.height / crop.height
        x, y, width, height = focus
        bounds = (pos[0] + (x - origin[0]) * scale_x, pos[1] + (y - origin[1]) * scale_y,
                  pos[0] + (x + width - origin[0]) * scale_x, pos[1] + (y + height - origin[1]) * scale_y)
        draw.rounded_rectangle(bounds, radius=8, outline=COLORS["highlight"], width=3)

    footer = frame.get("hint") or ("Vista ampliada · El recuadro señala dónde actuar" if focus else "Sigue el recorrido · Puedes pausar o avanzar por pasos")
    if draw.textlength(footer, font=FONT_SMALL) > 850:
        raise ValueError(f"Acorta la pista del paso: {footer}")
    draw.text((32, 772), footer, font=FONT_SMALL, fill=COLORS["muted"])
    progress_width = 252
    gap = 6
    segment = (progress_width - gap * (total - 1)) / total
    for step in range(total):
        left = WIDTH - 32 - progress_width + step * (segment + gap)
        draw.rounded_rectangle((left, 777, left + segment, 783), radius=3,
                               fill=COLORS["teal"] if step <= index else COLORS["track"])
    return canvas


def frame_duration(frame: dict) -> int:
    # A minimum five seconds lets the reader locate the control as well as read.
    computed = math.ceil((2500 + len(frame["caption"].split()) * 250) / 100) * 100
    return max(5000, min(12000, int(frame.get("durationMs", computed))))


def generate_article_media(article_id: str, frames_spec: list[dict], capture_version: str) -> None:
    rendered = [render_frame(frame, index, len(frames_spec), capture_version) for index, frame in enumerate(frames_spec)]
    gif_frames = [frame.quantize(colors=224, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for frame in rendered]
    for index, frame in enumerate(rendered):
        frame.save(OUTPUT_DIR / f"{article_id}-step-{index + 1}.png", format="PNG", optimize=True)
    rendered[0].save(OUTPUT_DIR / f"{article_id}-poster.png", format="PNG", optimize=True)
    gif_frames[0].save(
        OUTPUT_DIR / f"{article_id}.gif", format="GIF", save_all=True,
        append_images=gif_frames[1:], duration=[frame_duration(frame) for frame in frames_spec],
        loop=0, disposal=2, optimize=True,
    )


def validate_manifest(content: dict, manifest: dict) -> None:
    article_ids = {article["id"] for article in content["articles"]}
    mapped_ids = set(manifest.get("articles", {}))
    if article_ids != mapped_ids:
        raise ValueError(f"Manifest incompleto. Faltan={sorted(article_ids - mapped_ids)}; desconocidos={sorted(mapped_ids - article_ids)}")
    if not manifest.get("captureVersion"):
        raise ValueError("Falta la versión real de las capturas")
    for article_id, frames in manifest["articles"].items():
        if len(frames) < 3:
            raise ValueError(f"{article_id}: se requieren al menos 3 pasos reales")
        for frame in frames:
            image = frame.get("image", "")
            if not image or Path(image).name != image or not frame.get("caption"):
                raise ValueError(f"{article_id}: imagen o texto inválido")
            path = SOURCE_DIR / image
            if not path.is_file():
                raise FileNotFoundError(f"{article_id}: falta {path.relative_to(ROOT)}")
            with Image.open(path) as screenshot:
                viewport = frame.get("viewport", manifest["viewport"])
                if screenshot.size != (viewport["width"], viewport["height"]):
                    raise ValueError(f"{image}: tamaño distinto del viewport declarado")
                focus = frame.get("focus")
                if focus is not None:
                    if len(focus) != 4 or not all(isinstance(value, (int, float)) for value in focus):
                        raise ValueError(f"{article_id}: focus debe ser [x, y, ancho, alto]")
                    x, y, width, height = focus
                    if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > screenshot.width or y + height > screenshot.height:
                        raise ValueError(f"{article_id}: focus fuera de la captura")
            if "durationMs" in frame and not 5000 <= frame["durationMs"] <= 12000:
                raise ValueError(f"{article_id}: duración fuera del rango de lectura 5000–12000 ms")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--article", action="append", help="Regenerar solo este artículo; se puede repetir")
    args = parser.parse_args()
    content = json.loads(CONTENT_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    validate_manifest(content, manifest)
    requested = set(args.article or manifest["articles"])
    unknown = requested - set(manifest["articles"])
    if unknown:
        parser.error(f"Artículos desconocidos: {', '.join(sorted(unknown))}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for article_id, frames in manifest["articles"].items():
        if article_id in requested:
            generate_article_media(article_id, frames, manifest["captureVersion"])
            print(f"generated assets/help/{article_id}.gif ({len(frames)} pasos)")
    # Never delete unrelated or previously generated files automatically.
    print(f"generated {len(requested)} tutorials: GIF, poster and individual steps")


if __name__ == "__main__":
    main()
