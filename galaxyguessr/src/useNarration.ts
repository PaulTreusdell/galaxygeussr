import audioManifest from '../public/audio/manifest.json'
import { useCallback, useEffect, useRef, useState } from 'react'
type AudioManifest = Record<string, string>
export function useNarration() {
  const [speaking, setSpeaking] = useState(false)
  const [status, setStatus] = useState('')
  const audio = useRef<HTMLAudioElement | null>(null)
  const manifest: AudioManifest = audioManifest
  const request = useRef(0)
  const stop = useCallback(() => {
    request.current++
    if (audio.current) {
      audio.current.onended = null
      audio.current.onerror = null
      audio.current.pause()
    }
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])
  useEffect(() => stop, [stop])
  const speak = useCallback(async (key: string, text: string) => {
    stop()
    const id = request.current
    let fallbackStarted = false
    const browserVoice = () => {
      if (request.current !== id || fallbackStarted) return
      fallbackStarted = true
      audio.current?.pause()
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
    if (manifest[key]) {
      const player = audio.current ?? new Audio()
      audio.current = player
      player.src = manifest[key]
      player.preload = 'auto'
      player.volume = 1
      player.muted = false
      setSpeaking(true)
      setStatus('Loading narration...')
      player.onended = () => { if (request.current === id) setSpeaking(false) }
      player.onerror = browserVoice
      try { await player.play(); if (id === request.current) { setSpeaking(true); setStatus('ElevenLabs narration · transcript available') } } catch (error) {
        if (request.current !== id) return
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setSpeaking(false); setStatus('Tap Play narration to allow audio in this browser.')
        } else browserVoice()
      }
    } else browserVoice()
  }, [stop])
  return { speak, stop, speaking, status }
}
