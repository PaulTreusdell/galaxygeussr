# GalaxyGuessr

A responsive, five-round space guessing game built with React, TypeScript, Vite, Tailwind CSS, Three.js, and React Three Fiber.

## Run

```sh
npm install
npm run dev
npm test
npm run build
```

The production output is `dist/`, suitable for static hosting. `.openai/hosting.json` configures Sites hosting. No account, database, or runtime server is required. Personal bests are saved on the current device using localStorage.

## The mission

Each run shuffles six destinations and plays five unique rounds. Drag or swipe to look around. Focus the viewer and use arrow keys to rotate, `+`/`−` to zoom, and `R` to reset. The viewer supports fullscreen and limits device pixel ratio for mobile performance. The Three.js bundle loads only when an explorer is opened. WebGL failures fall back to horizontal panoramic viewing.

A correct guess starts at 5,000 points. The opening clue is free; each of two additional clues costs 500 points. After 30 seconds, time costs 5 points per second, capped at 1,000. Incorrect guesses earn zero. Maximum mission score: 25,000. Timers begin after the panorama is ready and pause in the exit dialog. The results show score, accuracy, time, discoveries, and a personal best.

## Narration

All clues and explanations are available as visible text. Until static ElevenLabs clips are generated, the play controls use the browser's speech synthesis service when available. Device voices and network requirements vary by browser. Ambient sound is synthesized locally and opt-in. Audio is labeled truthfully in the UI.

To generate the 24 static ElevenLabs clips, set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in your local `.env` file or shell (Node.js 22 or newer), then run:

```sh
npm run audio:generate
npm run build
```

The script calls ElevenLabs from Node, writes clips to `public/audio/`, and updates `manifest.json` after each clip. It resumes without purchasing existing audio again. Regenerate a changed clip by removing that specific MP3 first. Check your ElevenLabs quota before generation; no paid API calls are made by the website itself. Never put API keys in client files or use a `VITE_` variable for secrets.

The integration follows the [ElevenLabs speech endpoint](https://elevenlabs.io/docs/api-reference/text-to-speech/convert). Credentials are intentionally excluded from source control.

## Scientific and image provenance

The six destinations are Mars, Earth's Moon, Europa, Titan, Venus, and a fictional spacecraft viewpoint near an unspecified black hole. NASA science references are linked in every destination's field notes and in round reveals. Temperature, gravity, and distance values are approximate; host-planet and Earth-relative distances are explicitly identified.

Mars and Moon textures use NASA panoramic photographs adapted for full-sphere viewing; missing coverage is reconstructed and labeled. See `asset-sources.json` for photographic provenance. Europa, Titan, Venus, and black-hole panoramas are AI-generated scientific artist impressions, prominently labeled as simulations. They are not actual surface photographs or numerical physical models. Generated imagery cannot guarantee exact geometry or seam continuity. See `image-prompts.json` for prompts and generation method.

No NASA API key is required because the site uses curated local data and static imagery. NASA is a source of science and photography, not an endorser of this project.

## Accessibility and performance

Keyboard-operable navigation and guessing; focus-managed dialogs; visible focus styles; subtitles for every narration; reduced-motion preferences; no autoplay ambient audio. Game images are compressed local JPEGs. Landing thumbnails use the same local assets, and the 3D code loads on demand.
