"""Create original schematic object previews and equirectangular globe textures.

These illustrations are independent of the NASA challenge photographs.
They represent visual characteristics, not measured maps or relative sizes.
"""
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parent.parent
worlds = json.loads((root / 'src/data/locations.json').read_text(encoding='utf-8'))
for directory in ('objects', 'textures'):
    (root / 'public' / directory).mkdir(exist_ok=True)

for index, world in enumerate(worlds):
    rng = np.random.default_rng(index + 87)
    key, category = world['id'], world['category']
    color = np.array(tuple(bytes.fromhex(world['color'][1:])))
    w, h = 512, 256
    low = Image.fromarray(np.uint8(rng.uniform(0, 255, (32, 64)))).resize((w, h), Image.Resampling.BICUBIC)
    noise = np.asarray(low) / 255
    fine = rng.uniform(-.10, .10, (h, w))
    levels = .65 + noise * .6 + fine
    if key in ('jupiter', 'saturn', 'venus', 'titan'):
        y, x = np.mgrid[0:h, 0:w]
        levels += .18 * np.sin(y / (11 if key == 'jupiter' else 20) + .8*np.sin(x/75))
    texture = Image.fromarray(np.uint8(np.clip(color[None, None, :] * levels[:, :, None], 0, 255)))
    draw = ImageDraw.Draw(texture, 'RGBA')
    if category in ('planets', 'moons', 'minor-planets', 'comets') and key not in ('jupiter', 'saturn', 'venus', 'titan'):
        for _ in range(100):
            x, y, radius = int(rng.integers(0, w)), int(rng.integers(0, h)), int(rng.integers(3, 24))
            draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=(30, 24, 24, 50), outline=(240, 230, 210, 45), width=2)
    if key == 'europa':
        for _ in range(24):
            x, y = int(rng.integers(w)), int(rng.integers(h))
            draw.line([(x, y), (x+85, y-18), (x+180, y+20)], fill=(119, 79, 56, 170), width=3)
    if key == 'jupiter': draw.ellipse((290, 150, 380, 176), fill=(172, 84, 51, 210))
    texture.save(root / 'public/textures' / f'{key}.jpg', quality=88)
    # Orthographic sphere with spherical texture coordinates and directional lighting.
    n = 320
    y, x = np.mgrid[-1:1:complex(n), -1:1:complex(n)]
    inside = x*x + y*y <= .90**2
    xx, yy = x/.90, y/.90
    z = np.sqrt(np.maximum(0, 1 - xx*xx - yy*yy))
    u = ((np.arctan2(xx, z) / (2*math.pi) + .53) * (w-1)).astype(int) % w
    v = np.clip((np.arcsin(np.clip(yy, -1, 1)) / math.pi + .5) * (h-1), 0, h-1).astype(int)
    light = np.clip(-xx*.48 - yy*.35 + z*.76, 0, 1) * .85 + .12
    if category == 'stars': light = np.ones_like(light) * .92
    rgba = np.zeros((n, n, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.uint8(np.clip(np.asarray(texture)[v, u] * light[:, :, None], 0, 255))
    rgba[:, :, 3] = inside.astype(np.uint8) * 255
    sphere = Image.fromarray(rgba)
    sphere.save(root / 'public/objects' / f'{key}.webp', quality=82)
    old_png = root / 'public/objects' / f'{key}.png'
    if old_png.exists(): old_png.unlink()

    # Non-spherical phenomena receive deliberately schematic symbols instead of globes.
    if category in ('galaxies', 'exotic', 'comets') or key == 'saturn':
        parts = []
        if category == 'galaxies':
            for arm in range(3):
                points = []
                for t in np.linspace(.1, 5, 140):
                    r, a = 13 + t*28, t + arm*2*math.pi/3
                    points.append(f'{200+math.cos(a)*r:.1f},{200+math.sin(a)*r*.60:.1f}')
                parts.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="{world["color"]}" stroke-width="11" opacity=".7" filter="url(#blur)"/>')
            parts.append('<ellipse cx="200" cy="200" rx="30" ry="18" fill="#fff4da" filter="url(#blur)"/>')
        elif key == 'blackhole':
            parts.append('<ellipse cx="200" cy="205" rx="166" ry="48" fill="none" stroke="#ebb778" stroke-width="17" filter="url(#blur)"/><circle cx="200" cy="200" r="70" fill="#05080b" stroke="#ffd9a1" stroke-width="5"/>')
        elif key == 'pulsar':
            parts.append('<path d="M200 45L190 185L200 355L210 215Z" fill="#c5cdff" filter="url(#blur)"/><ellipse cx="200" cy="200" rx="112" ry="42" fill="none" stroke="#8898e4" stroke-width="9" transform="rotate(-24 200 200)"/><circle cx="200" cy="200" r="17" fill="#eef1ff"/>')
        elif key in ('supernova', 'nebula', 'lens'):
            parts.append(f'<ellipse cx="200" cy="200" rx="115" ry="{110 if key == "supernova" else 75}" fill="none" stroke="{world["color"]}" stroke-width="{30 if key != "lens" else 6}" filter="url(#blur)"/><circle cx="200" cy="200" r="9" fill="#fff3d4"/>')
        elif category == 'comets':
            parts.append(f'<path d="M170 235Q215 140 365 65Q320 180 192 250Z" fill="{world["color"]}" opacity=".5" filter="url(#blur)"/><ellipse cx="165" cy="250" rx="50" ry="36" fill="url(#rock)" transform="rotate(-25 165 250)"/>')
        elif key == 'saturn':
            parts.append(f'<image href="{key}.webp" x="70" y="70" width="260" height="260"/><ellipse cx="200" cy="200" rx="183" ry="49" fill="none" stroke="#bdad88" stroke-width="20" transform="rotate(-20 200 200)"/>')
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><filter id="blur"><feGaussianBlur stdDeviation="4"/></filter><radialGradient id="rock"><stop stop-color="#beb6a7"/><stop offset="1" stop-color="#3e3932"/></radialGradient></defs>{"".join(parts)}</svg>'
        # Saturn embeds its globe to keep this asset self-contained in a Worker.
        if key == 'saturn':
            import base64
            encoded = base64.b64encode((root / 'public/objects/saturn.webp').read_bytes()).decode()
            svg = svg.replace('href="saturn.webp"', f'href="data:image/webp;base64,{encoded}"')
        (root / 'public/objects' / f'{key}.svg').write_text(svg, encoding='utf-8')
        world['preview'] = f'/objects/{key}.svg'
    else:
        world['preview'] = f'/objects/{key}.webp'
    world['texture'] = f'/textures/{key}.jpg'

(root / 'src/data/locations.json').write_text(json.dumps(worlds, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Created 35 original object previews and globe textures.')
