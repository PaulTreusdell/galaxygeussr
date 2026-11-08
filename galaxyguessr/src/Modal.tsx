import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
export default function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const els = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')
        if (!els?.length) return
        if (e.shiftKey && (document.activeElement === els[0] || document.activeElement === panel.current)) { e.preventDefault(); els[els.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', key); previous?.focus() }
  }, [onClose])
  return <div className="modal-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div className={`modal ${wide ? 'modal-wide' : ''}`} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}><div className="modal-title"><span className="eyebrow">{title}</span><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={21} /></button></div>{children}</div></div>
}
