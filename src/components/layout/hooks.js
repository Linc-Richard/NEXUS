import { useEffect, useRef } from 'react'

export function useOutsideClick(ref, handler, active = true) {
  const saved = useRef(handler)
  saved.current = handler
  useEffect(() => {
    if (!active) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) saved.current()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [ref, active])
}