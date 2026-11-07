"""Compress project-bound generated panoramas without changing their composition."""
from pathlib import Path
import sys
from PIL import Image

destination = Path(__file__).resolve().parent.parent / 'public' / 'panoramas'
destination.mkdir(parents=True, exist_ok=True)
for argument in sys.argv[1:]:
    name, path = argument.split('=', 1)
    if name not in ('europa', 'titan', 'venus', 'blackhole'):
        raise ValueError('Unknown panorama name')
    image = Image.open(path).convert('RGB')
    image.thumbnail((2560, 1280), Image.Resampling.LANCZOS)
    target = destination / f'{name}.jpg'
    image.save(target, quality=86, optimize=True, progressive=True)
    print(f'{name}: {image.width}x{image.height}, {target.stat().st_size // 1024} KB')
