import Vec3 from '../core/vec3'
import { createSeededRng } from '../core/rng'
import Camera from './camera'
import { randomScene } from './scene'

export interface RendererProgress {
    completedRows: number
    totalRows: number
    progress: number
}

interface RenderOptions {
    onProgress?: (progress: RendererProgress) => void
    rowsPerChunk?: number
    signal?: AbortSignal
}

const world = randomScene(createSeededRng(1337))
const offscreenCache = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>()

export async function render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options?: RenderOptions
): Promise<void> {
    if (options?.signal?.aborted) {
        return
    }

    const imageWidth = Math.max(320, Math.floor(width / 2))
    const imageHeight = Math.max(180, Math.floor(height / 2))

    const camera = new Camera({
        imageWidth,
        imageHeight,
        samplesPerPixel: 20,
        maxDepth: 20,
        vfov: 20,
        lookFrom: new Vec3(13, 2, 3),
        lookAt: new Vec3(0, 0, 0),
        vup: new Vec3(0, 1, 0),
        defocusAngle: 0.6,
        focusDist: 10,
    })

    const offscreen = getOrCreateOffscreen(ctx, imageWidth, imageHeight)
    const offscreenCtx = offscreen.getContext('2d')
    if (!offscreenCtx) {
        return
    }

    const image = await camera.render(world, {
        onProgress: options?.onProgress,
        rowsPerChunk: options?.rowsPerChunk,
        signal: options?.signal,
        onChunk: (partialImage) => {
            if (options?.signal?.aborted) {
                return
            }

            drawScaled(ctx, offscreenCtx, partialImage, width, height)
        },
    })

    if (options?.signal?.aborted) {
        return
    }

    drawScaled(ctx, offscreenCtx, image, width, height)
}

function getOrCreateOffscreen(
    ctx: CanvasRenderingContext2D,
    imageWidth: number,
    imageHeight: number
): HTMLCanvasElement {
    const cached = offscreenCache.get(ctx)
    if (cached && cached.width === imageWidth && cached.height === imageHeight) {
        return cached
    }

    const offscreen = document.createElement('canvas')
    offscreen.width = imageWidth
    offscreen.height = imageHeight
    offscreenCache.set(ctx, offscreen)
    return offscreen
}

function drawScaled(
    ctx: CanvasRenderingContext2D,
    offscreenCtx: CanvasRenderingContext2D,
    image: ImageData,
    width: number,
    height: number
): void {
    offscreenCtx.putImageData(image, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(offscreenCtx.canvas, 0, 0, width, height)
}
