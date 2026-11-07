import { useCallback, useEffect, useRef, useState } from 'react'
type AudioManifest = Record<string, string>
export function useNarration() {
  const [speaking, setSpeaking] = useState(false)
  const [status, setStatus] = useState('')
  const audio = useRef<HTMLAudioElement | null>(null)
  const manifest = useRef<AudioManifest>({})
  const request = useRef(0)
  const stop = useCallback(() => {
    request.current++
    audio.current?.pause()
    audio.current = null
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])
  useEffect(() => {
    fetch('/audio/manifest.json').then(r => r.ok ? r.json() : {}).then(m => { manifest.current = m }).catch(() => {})
    return stop
  }, [stop])
  const speak = useCallback(async (key: string, text: string) => {
    stop()
    const id = request.current
    const browserVoice = () => {
      if (request.current !== id) return
      if (!('speechSynthesis' in window)) { setStatus('Voice is unavailable on this browser. The full transcript is below.'); return }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.92
      utterance.lang = 'en-US'
      const voices = window.speechSynthesis.getVoices()
      utterance.voice = voices.find(v => /en-US/.test(v.lang) && /Natural|Google|Samantha|Aria/.test(v.name)) ?? voices.find(v => v.lang.startsWith('en')) ?? null
      utterance.onend = () => { if (request.current === id) setSpeaking(false) }
      utterance.onerror = () => { if (request.current === id) { setSpeaking(false); setStatus('Voice could not play. You can read the full transcript below.') } }
      setStatus('Device voice · transcript available')
      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
    if (manifest.current[key]) {
      const player = new Audio(manifest.current[key])
      audio.current = player
      player.onended = () => { if (request.current === id) setSpeaking(false) }
      player.onerror = browserVoice
      try { await player.play(); if (id === request.current) { setSpeaking(true); setStatus('ElevenLabs narration · transcript available') } else player.pause() } catch { browserVoice() }
    } else browserVoice()
  }, [stop])
  return { speak, stop, speaking, status }
}
