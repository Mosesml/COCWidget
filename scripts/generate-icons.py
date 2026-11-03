"""Render the original four-tile wordmark for native launchers (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

assets = Path(__file__).resolve().parents[1] / "assets"
forest, lime, subdued = "#253D2B", "#DAEABC", "#77916A"
for filename, adaptive in [("app-icon.png", False), ("adaptive-icon.png", True)]:
    image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0) if adaptive else forest)
    draw = ImageDraw.Draw(image)
    size, gap = (192, 56) if adaptive else (240, 64)
    origin = (1024 - 2 * size - gap) // 2
    for row in range(2):
        for col in range(2):
            left, top = origin + col * (size + gap), origin + row * (size + gap)
            draw.rounded_rectangle((left, top, left + size, top + size), radius=42,
                                   fill=lime if row == col else subdued)
    image.save(assets / filename)
