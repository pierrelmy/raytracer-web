import { useEffect, useRef, useState } from "react"
import { render } from "../renderer/cpuRenderer.ts"

export default function Canvas()
{
  const containerRef = useRef<HTMLDivElement | null>(null)
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [isRendering, setIsRendering] = useState(false)
  const frameRef = useRef<number | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const renderIdRef = useRef(0)

  const updateProgress = (value: number) => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = requestAnimationFrame(() => {
      setProgress(value)
      frameRef.current = null
    })
  }

  useEffect(() => {
    const container = containerRef.current
    const canvas = ref.current
    if (!container || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let isMounted = true

    const startRender = (width: number, height: number) => {
      const nextWidth = Math.max(1, Math.round(width))
      const nextHeight = Math.max(1, Math.round(height))

      renderIdRef.current += 1
      const renderId = renderIdRef.current

      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      canvas.width = nextWidth
      canvas.height = nextHeight
      setIsRendering(true)
      setProgress(0)

      void render(ctx, canvas.width, canvas.height, {
          signal: controller.signal,
          rowsPerChunk: 3,
          onProgress: ({ progress: p }) => {
            if (!isMounted || renderId !== renderIdRef.current) return
            updateProgress(p)
          },
        })
        .then(() => {
          if (!isMounted || renderId !== renderIdRef.current) return
          if (controller.signal.aborted) return
          updateProgress(1)
          setIsRendering(false)
        })
        .catch((error: unknown) => {
          if (!isMounted || renderId !== renderIdRef.current) return
          if (error instanceof DOMException && error.name === "AbortError") return
          setIsRendering(false)
        })
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const { width, height } = entry.contentRect
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
      }

      resizeFrameRef.current = requestAnimationFrame(() => {
        startRender(width, height)
      })
    })

    observer.observe(container)

    const rect = container.getBoundingClientRect()
    startRender(rect.width, rect.height)

    return () => {
      isMounted = false
      observer.disconnect()
      abortControllerRef.current?.abort()

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }

      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-black">
      <canvas
        ref={ref}
        className="w-screen h-screen"
      />

      {isRendering && (
        <div className="absolute left-1/2 top-6 w-[min(520px,90vw)] -translate-x-1/2 rounded-xl border border-white/20 bg-black/60 px-4 py-3 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/80">
            <span>Rendering</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-sky-500 transition-[width] duration-100"
              style={{ width: `${Math.max(2, progress * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}