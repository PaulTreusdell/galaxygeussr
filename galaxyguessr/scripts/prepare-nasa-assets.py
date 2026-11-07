"""Adapt partial-vertical cylindrical NASA mosaics to a 2:1 spherical texture.

The source mosaics do not contain zenith/nadir coverage or camera calibration.
This uses an approximate cylindrical model and diffuse edge extension where
the photograph has no coverage. It does not invent terrain detail.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parent.parent
out = root / 'public' / 'panoramas'
out.mkdir(parents=True, exist_ok=True)
width, height = 3072, 1536
for name, horizon_fraction, sky in [('mars', .17, (197, 172, 154)), ('moon', .48, (0, 0, 0))]:
    source = Image.open(root / 'tmp-assets' / f'{name}-source.jpg').convert('RGB')
    source = source.resize((width, round(source.height * width / source.width)), Image.Resampling.LANCZOS)
    pixels = np.asarray(source, dtype=np.float64)
    source_height = source.height
    horizon = source_height * horizon_fraction
    focal = width / (2 * np.pi)
    latitude = (np.arange(height) / (height - 1) - .5) * np.pi
    source_y = horizon + focal * np.tan(np.clip(latitude, -1.56, 1.56))
    low = np.clip(np.floor(source_y).astype(int), 0, source_height - 1)
    high = np.clip(low + 1, 0, source_height - 1)
    weight = (source_y - np.floor(source_y))[:, None, None]
    output = pixels[low] * (1 - weight) + pixels[high] * weight
    ground = np.median(pixels[round(source_height * .82):round(source_height * .94)], axis=(0, 1))
    upper = source_y < 0
    lower = source_y > source_height - 1
    if upper.any():
        fade = np.linspace(1, 0, upper.sum())[:, None, None] ** .45
        edge = np.asarray(source.crop((0, 0, width, 5)).resize((width, 1)).filter(ImageFilter.GaussianBlur(10)), dtype=float)
        output[upper] = edge * (1 - fade) + np.array(sky) * fade
    # Fade extended edge rows into a diffuse ground color toward the nadir.
    if lower.any():
        fade = np.linspace(0, 1, lower.sum())[:, None, None] ** .25
        edge = np.asarray(source.crop((0, source_height - 5, width, source_height)).resize((width, 1)).filter(ImageFilter.GaussianBlur(8)), dtype=float)
        output[lower] = edge * (1 - fade) + ground * fade
    image = Image.fromarray(np.clip(output, 0, 255).astype(np.uint8))
    image.save(out / f'{name}.jpg', quality=87, optimize=True, progressive=True)
    print(f'{name}: {width}x{height} equirectangular adaptation; missing vertical coverage extended')
hero = Image.open(root / 'tmp-assets' / 'mars-globe-source.jpg').convert('RGB')
hero.thumbnail((1100, 1100), Image.Resampling.LANCZOS)
hero.save(root / 'public' / 'mars-globe.jpg', quality=91, optimize=True, progressive=True)
print('NASA Mars globe compressed')
