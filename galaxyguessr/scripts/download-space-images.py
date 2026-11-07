"""Download reviewed NASA library images, compress, and retain attribution."""
import concurrent.futures
import io
import json
from pathlib import Path
from urllib.request import urlopen
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent
catalog = json.loads((root / 'challenge-sources.json').read_text(encoding='utf-8'))
out = root / 'public/challenges'
out.mkdir(exist_ok=True)
def download(pair):
    filename, meta = pair
    key = Path(filename).stem
    url = meta['download']
    with urlopen(url, timeout=30) as response: content = response.read()
    img = Image.open(io.BytesIO(content)).convert('RGB')
    img.thumbnail((1200, 1000), Image.Resampling.LANCZOS)
    if key in ('vesta', 'pluto'):
        img = img.crop((0, 0, img.width, img.height - 28))
    if key == 'pluto': img = img.crop((int(img.width*.2), 0, img.width, img.height))
    if key == 'protostar': img = img.crop((int(img.width*.52), int(img.height*.15), int(img.width*.80), int(img.height*.64)))
    img.save(out / f'{key}.jpg', quality=86, optimize=True)
    return f'public/challenges/{key}.jpg', {**meta, 'download': url,
        'source': 'https://images.nasa.gov/details/' + meta['id'],
        'processing': 'Resized and JPEG compressed' + ('; cropped to remove identifying annotation' if key in ('vesta', 'pluto', 'protostar') else '') + '; telescope colors may represent non-visible wavelengths.'}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    sources = dict(executor.map(download, catalog.items()))
(root / 'challenge-sources.json').write_text(json.dumps(sources, indent=2), encoding='utf-8')
sheet = Image.new('RGB', (1000, 6 * 160), '#101418')
draw = ImageDraw.Draw(sheet)
for i, filename in enumerate(catalog):
    key = Path(filename).stem
    image = Image.open(out / f'{key}.jpg'); image.thumbnail((192, 132))
    x, y = (i % 5) * 200, (i // 5) * 160
    sheet.paste(image, (x + (200 - image.width)//2, y))
    draw.text((x + 5, y + 135), key, fill='white')
sheet.save(root / 'tmp-assets/contact.jpg')
print(f'Downloaded {len(sources)} reviewed images.')
