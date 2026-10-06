import Konva from "konva"
import { useEffect, useRef } from "react"

interface MountAnimationOptions {
  /** Seconds to wait before playing, for staggered entrances. */
  delay?: number
  /** Animation length in seconds. */
  duration?: number
}

/**
 * Fades a Konva group in on mount. Opacity-only on purpose: scaling would
 * move hit areas mid-animation and misdirect fast clicks.
 */
export function useMountAnimation({
  delay = 0,
  duration = 0.22,
}: MountAnimationOptions = {}) {
  const ref = useRef<Konva.Group | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.opacity(0)
    const tween = new Konva.Tween({
      node,
      duration,
      easing: Konva.Easings.EaseOut,
      opacity: 1,
    })
    if (delay > 0) {
      const timer = window.setTimeout(() => tween.play(), delay * 1000)
      return () => {
        window.clearTimeout(timer)
        tween.destroy()
      }
    }
    tween.play()
    return () => {
      tween.destroy()
    }
  }, [delay, duration])

  return ref
}
