# GalaxyGuessr

A responsive space guessing game with 35 destinations, seven specialist expeditions, a mixed expedition, rotatable object previews, and shared leaderboards. Built with React, TypeScript, Vite, Three.js, and a Cloudflare Worker with D1 storage.

## Run

```sh
npm install
npm run dev
npm test
npm run build
```

Node.js 20+ and Python 3 are required for local development and integration tests. Python's standard-library SQLite provides the local equivalent of hosted D1. Vite serves the game and `/api` routes; scores persist in the ignored `.local/leaderboard.sqlite`, separate from production.

The build produces the client at `dist/client` and a self-contained Worker at `dist/server/index.js`. `.openai/hosting.json` preserves the existing Site ID and declares the `DB` binding. Sites provisions D1 and applies the schema in `drizzle/` on publication. A static-only host supports practice play but cannot provide shared rankings. No account or production database credentials are needed locally.

## The mission

Choose planets, moons, minor planets (including dwarf planets and asteroids), stars (including stellar types and remnants), comets, exotic phenomena, or galaxies. Each category contains five destinations. All space draws five different categories and selects one destination from each. Choices are shuffled independently and always include the answer.

Home, field-guide, and sidebar object illustrations use `preview`; the mystery viewer uses a separate `image`. Globe maps and illustrations are schematic, not measured maps or relative sizes. Field-guide spheres support pointer and keyboard rotation, including software rendering without WebGL. Six original destinations retain their panoramas; new NASA archive images use an image observer with pan, zoom, keyboard controls, and fullscreen. The Three.js bundle loads only when an explorer is opened.

A correct guess starts at 5,000 points. The opening clue is free; each of two additional clues costs 500 points. After 30 seconds, time costs 5 points per second, capped at 1,000. Incorrect guesses earn zero. Maximum mission score: 25,000. Timers begin after the image is ready and pause in the exit dialog. Personal bests save separately per category on the device.

## Leaderboards and privacy

Posting scores is optional. Category boards retain each explorer's best mission, breaking score ties by elapsed time. The Overall board sums best scores in the seven specialist categories, up to 175,000 points. Mixed All space missions have a separate board. Boards show the top 50 explorers and contain no fabricated scores.

An HTTP-only SameSite cookie identifies an explorer without an account. Optional names are normalized and reserved case-insensitively through a database uniqueness constraint. The browser that claims a name owns it; clearing cookies creates a new identity, and names cannot be recovered across browsers without an account system. Posting anonymously hides the explorer's name on all boards while retaining the name reservation.

The server creates missions, binds them to their explorer, validates five matching rounds, recalculates points, rejects impossible timing and categories, and makes duplicate submissions idempotent. Name claims and score writes are atomic. These are recreational rankings: the client-visible catalog means they are not a tamper-proof competitive platform. Disconnected runs remain playable as clearly labeled practice expeditions and cannot post scores.

## Narration

All clues and explanations are available as visible text. Until static ElevenLabs clips are generated, the play controls use the browser's speech synthesis service when available. Device voices and network requirements vary by browser. Ambient sound is synthesized locally and opt-in. Audio is labeled truthfully in the UI.

To optionally generate the expanded catalog's 140 static ElevenLabs clips, set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in your local `.env` file or shell (Node.js 22 or newer), then run:

```sh
npm run audio:generate
npm run build
```

The script calls ElevenLabs from Node, writes clips to `public/audio/`, and updates `manifest.json` after each clip. It resumes without purchasing existing audio again. Regenerate a changed clip by removing that specific MP3 first. Check your ElevenLabs quota before generation; no paid API calls are made by the website itself. Never put API keys in client files or use a `VITE_` variable for secrets.

The integration follows the [ElevenLabs speech endpoint](https://elevenlabs.io/docs/api-reference/text-to-speech/convert). Credentials are intentionally excluded from source control.

## Scientific and image provenance

The catalog contains 35 destinations across seven categories. The original Mars, Moon, Europa, Titan, Venus, and fictional black-hole viewpoint remain available. NASA source links appear in field notes and round reveals. Temperature, gravity, and distance values are approximate; host-planet and Earth-relative distances are explicitly identified.

Mars and Moon textures use NASA panoramic photographs adapted for full-sphere viewing; missing coverage is reconstructed and labeled. See `asset-sources.json` for photographic provenance. Europa, Titan, Venus, and black-hole panoramas are AI-generated scientific artist impressions, prominently labeled as simulations. They are not actual surface photographs or numerical physical models. Generated imagery cannot guarantee exact geometry or seam continuity. See `image-prompts.json` for prompts and generation method.

New archive assets, image-specific credits, processing notes, and source links are recorded in `challenge-sources.json`. NASA artist illustrations are distinguished from photographs; telescope images can show non-visible wavelengths. No NASA API key is required. NASA is a source of science and photography, not an endorser of this project.

Committed assets are sufficient to run and build. To regenerate archive downloads, install Pillow and run `python scripts/download-space-images.py`. To regenerate original object illustrations, install Pillow and NumPy and run `python scripts/create-object-art.py`. `scripts/expand-catalog.py` contains the curated text and category definitions; run the object-art script after regenerating that catalog.

## Accessibility and performance

Keyboard-operable navigation, guessing, image inspection, and globe rotation; focus-managed dialogs; visible focus styles; subtitles for narration; reduced-motion preferences; opt-in ambience. Images are compressed local assets, with independent object previews and on-demand 3D code.

`npm test` covers category isolation, mixed coverage, choice uniqueness, separate assets, scoring, real SQLite-backed leaderboard aggregation, shared visibility, name collisions, anonymous privacy, mission ownership, malformed results, and duplicate submissions. `npm run build` includes TypeScript checking.

## Explorer accounts

Anyone can play. A username/password account is required to post leaderboard scores. Guests see a dismissible account dialog after a mission; registering or signing in preserves that completed mission so it can be posted immediately. Use the header to sign in or sign out. Existing guest leaderboard records are retained in storage but excluded from the account leaderboard.

Local development applies SQL migrations automatically. Before deploying the updated Worker, apply `drizzle/0001_accounts.sql` to the hosted database after the original migration. Passwords are salted and hashed with PBKDF2-SHA256; session tokens are hashed in storage and use HttpOnly cookies (Secure on HTTPS). Sessions expire after 30 days. Authentication attempts are limited per username. Password reset is not implemented; no email is collected.
