import Konva from "konva"
import { useEffect, useRef } from "react"

interface MountAnimationOptions {
  /** Seconds to wait before playing, for staggered entrances. */
  delay?: number
  /** Animation length in seconds. */
  duration?: number
  /** Starting scale (1 = no scaling). */
  fromScale?: number
}

/**
 * Pops a Konva group in on mount (fade + grow). Used for folders appearing
 * when collapsing and post-its appearing when expanding.
 */
export function useMountAnimation({
  delay = 0,
  duration = 0.22,
  fromScale = 0.7,
}: MountAnimationOptions = {}) {
  const ref = useRef<Konva.Group | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    node.scale({ x: fromScale, y: fromScale })
    node.opacity(0)
    const tween = new Konva.Tween({
      node,
      duration,
      easing: Konva.Easings.EaseOut,
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
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
  }, [delay, duration, fromScale])

  return ref
}
