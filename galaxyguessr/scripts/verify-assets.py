"""Fail the release if a destination texture is missing or not spherical 2:1."""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent
locations = json.loads((root / 'src/data/locations.json').read_text(encoding='utf-8'))
for location in locations:
    path = root / 'public' / location['image'].lstrip('/')
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        assert image.width == image.height * 2, f'{location["id"]}: expected a 2:1 equirectangular texture'
        assert image.width >= 1500, f'{location["id"]}: texture too small'
        assert path.stat().st_size <= 2_000_000, f'{location["id"]}: texture over mobile budget'
    assert len(location['clues']) >= 3
    assert location['source'].startswith('https://science.nasa.gov/')
    print(f'{location["id"]}: spherical texture, source, and three clues verified')
with Image.open(root / 'public/mars-globe.jpg') as image:
    image.verify()
print('Hero image verified')
