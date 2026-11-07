// Run locally with ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in the environment.
// This script is never imported into the browser application.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root = new URL('../', import.meta.url)
const key = process.env.ELEVENLABS_API_KEY
const voiceId = process.env.ELEVENLABS_VOICE_ID
if (!key || !voiceId) {
  console.error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in your local environment. No credentials are included in the client.')
  process.exit(1)
}
const locations = JSON.parse(await readFile(new URL('src/data/locations.json', root), 'utf8'))
const out = new URL('public/audio/', root)
await mkdir(out, { recursive: true })
let manifest = {}
try { manifest = JSON.parse(await readFile(new URL('manifest.json', out), 'utf8')) } catch {}
for (const location of locations) {
  const clips = [...location.clues.map((text, index) => ({ id: `${location.id}-clue-${index}`, text })), { id: `${location.id}-explanation`, text: location.explanation }]
  for (const clip of clips) {
    const dest = new URL(`${clip.id}.mp3`, out)
    let exists = false
    try { await access(dest); exists = true } catch {}
    if (!exists) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text: clip.text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: .6, similarity_boost: .75 } }),
        signal: AbortSignal.timeout(60000),
      })
      if (!response.ok) throw new Error(`Narration generation failed for ${clip.id}: HTTP ${response.status}. Existing clips are retained; retry to resume.`)
      await writeFile(dest, Buffer.from(await response.arrayBuffer()))
      console.log(`Generated ${clip.id}`)
    }
    manifest[clip.id] = `/audio/${clip.id}.mp3`
    await writeFile(new URL('manifest.json', out), JSON.stringify(manifest, null, 2) + '\n')
  }
}
console.log(`Narration ready in ${fileURLToPath(out)}. Rebuild and redeploy to publish the clips.`)
