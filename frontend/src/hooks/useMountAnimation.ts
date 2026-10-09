import Konva from "konva"
import { useEffect, useRef } from "react"

interface MountAnimationOptions {
  /** Seconds to wait before playing, for staggered entrances. */
  delay?: number
  /** Animation length in seconds. */
  duration?: number
  /** Starting scale for the pop effect. 1 disables scaling. */
  scaleFrom?: number
  /** Width/height used to keep the pop centered. */
  width?: number
  height?: number
}

/**
 * Pops a Konva group in on mount (fade + scale from the center).
 * The animated node must be an inner group positioned at the center of a
 * `width x height` card (x=width/2, y=height/2 with the same offset), so
 * scaling stays centered and the outer positioned group never moves.
 * Hit-testing is left untouched so cards stay clickable mid-animation.
 */
export function useMountAnimation({
  delay = 0,
  duration = 0.22,
  scaleFrom = 0.7,
  width = 0,
  height = 0,
}: MountAnimationOptions = {}) {
  const ref = useRef<Konva.Group | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const centerX = width / 2
    const centerY = height / 2
    if (width > 0 && height > 0) {
      node.x(centerX)
      node.y(centerY)
      node.offset({ x: centerX, y: centerY })
    }
    node.opacity(0)
    node.scale({ x: scaleFrom, y: scaleFrom })
    const tween = new Konva.Tween({
      node,
      duration,
      easing: Konva.Easings.BackEaseOut,
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
  }, [delay, duration, scaleFrom, width, height])

  return ref
}
