#!/usr/bin/env python3
"""Build offline help GIFs from real LibrePOS screenshots."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT / "src" / "help-content.json"
SOURCE_DIR = ROOT / "assets" / "help" / "source"
MANIFEST_PATH = SOURCE_DIR / "manifest.json"
OUTPUT_DIR = ROOT / "assets" / "help"

WIDTH = 960
HEIGHT = 540
SCREENSHOT_SIZE = (900, 506)
SCREENSHOT_ORIGIN = (30, 34)

COLORS = {
    "header": "#111827",
    "header_muted": "#CBD5E1",
    "paper": "#F7F8F6",
    "teal": "#0F766E",
    "white": "#FFFFFF",
    "border": "#CBD5E1",
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
    candidates = FONT_BOLD_CANDIDATES if bold else FONT_REGULAR_CANDIDATES
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT_SMALL = load_font(13)
FONT_SMALL_BOLD = load_font(13, True)
FONT_CAPTION = load_font(15, True)


def truncate_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> str:
    value = str(text).strip()
    if draw.textlength(value, font=font) <= max_width:
        return value
    suffix = "..."
    while value and draw.textlength(f"{value}{suffix}", font=font) > max_width:
        value = value[:-1]
    return f"{value.rstrip()}{suffix}"


def load_screenshot(path: Path) -> Image.Image:
    with Image.open(path) as source:
        image = source.convert("RGB")
    if image.width < 1000 or image.height < 600:
        raise ValueError(f"Screenshot demasiado pequeno: {path.relative_to(ROOT)} ({image.width}x{image.height})")
    return ImageOps.fit(
        image,
        SCREENSHOT_SIZE,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def render_frame(frame: dict, index: int, total: int, capture_version: str) -> Image.Image:
    screenshot_path = SOURCE_DIR / frame["image"]
    canvas = Image.new("RGB", (WIDTH, HEIGHT), COLORS["paper"])
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 0, WIDTH, 34), fill=COLORS["header"])
    draw.rounded_rectangle((30, 6, 106, 28), radius=5, fill=COLORS["teal"])
    step_label = f"PASO {index + 1}/{total}"
    step_width = draw.textlength(step_label, font=FONT_SMALL_BOLD)
    draw.text((68 - step_width / 2, 10), step_label, font=FONT_SMALL_BOLD, fill=COLORS["white"])

    version_label = f"CAPTURA REAL · v{capture_version}"
    version_width = draw.textlength(version_label, font=FONT_SMALL)
    version_x = WIDTH - 30 - version_width
    caption = truncate_text(draw, frame["caption"], FONT_CAPTION, int(version_x - 130))
    draw.text((120, 9), caption, font=FONT_CAPTION, fill=COLORS["white"])
    draw.text((version_x, 10), version_label, font=FONT_SMALL, fill=COLORS["header_muted"])

    screenshot = load_screenshot(screenshot_path)
    canvas.paste(screenshot, SCREENSHOT_ORIGIN)
    draw.rectangle(
        (
            SCREENSHOT_ORIGIN[0],
            SCREENSHOT_ORIGIN[1],
            SCREENSHOT_ORIGIN[0] + SCREENSHOT_SIZE[0] - 1,
            SCREENSHOT_ORIGIN[1] + SCREENSHOT_SIZE[1] - 1,
        ),
        outline=COLORS["border"],
        width=1,
    )
    return canvas


def adaptive_frame(frame: Image.Image) -> Image.Image:
    return frame.quantize(colors=160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def generate_article_media(article_id: str, frames_spec: list[dict], capture_version: str) -> tuple[Path, Path]:
    rendered = [render_frame(frame, index, len(frames_spec), capture_version) for index, frame in enumerate(frames_spec)]
    gif_frames = [adaptive_frame(frame) for frame in rendered]

    gif_path = OUTPUT_DIR / f"{article_id}.gif"
    poster_path = OUTPUT_DIR / f"{article_id}-poster.png"
    rendered[0].save(poster_path, format="PNG", optimize=True)
    gif_frames[0].save(
        gif_path,
        format="GIF",
        save_all=True,
        append_images=gif_frames[1:],
        duration=[2300] * len(gif_frames),
        loop=0,
        disposal=2,
        optimize=True,
    )
    return gif_path, poster_path


def validate_manifest(content: dict, manifest: dict) -> None:
    article_ids = {article["id"] for article in content["articles"]}
    mapped_ids = set(manifest.get("articles", {}))
    if article_ids != mapped_ids:
        missing = sorted(article_ids - mapped_ids)
        unknown = sorted(mapped_ids - article_ids)
        raise ValueError(f"Manifest incompleto. Faltan={missing}; desconocidos={unknown}")

    for article_id, frames in manifest["articles"].items():
        if len(frames) < 3:
            raise ValueError(f"{article_id}: se requieren al menos 3 capturas reales")
        for frame in frames:
            if not frame.get("image") or not frame.get("caption"):
                raise ValueError(f"{article_id}: frame sin imagen o texto")
            path = SOURCE_DIR / frame["image"]
            if not path.is_file():
                raise FileNotFoundError(f"{article_id}: falta {path.relative_to(ROOT)}")


def main() -> None:
    content = json.loads(CONTENT_PATH.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    validate_manifest(content, manifest)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    expected: set[str] = set()
    for article in content["articles"]:
        article_id = article["id"]
        gif_path, poster_path = generate_article_media(
            article_id,
            manifest["articles"][article_id],
            manifest["captureVersion"],
        )
        expected.update((gif_path.name, poster_path.name))
        print(f"generated {gif_path.relative_to(ROOT)}")

    for path in OUTPUT_DIR.iterdir():
        if path.is_file() and path.name not in expected:
            path.unlink()
    print(f"generated {len(content['articles'])} real-interface tutorial GIFs and posters")


if __name__ == "__main__":
    main()
