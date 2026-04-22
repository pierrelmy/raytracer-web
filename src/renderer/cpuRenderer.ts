import Vec3 from '../core/vec3'
import { createSeededRng } from '../core/rng'
import Camera from './camera'
import BvhNode from './bvhNode'
import { randomScene } from './scene'

export type RendererMode = 'auto' | 'workers' | 'single'

export interface RendererStats {
    modeRequested: RendererMode
    modeUsed: 'workers' | 'single'
    durationMs: number
    imageWidth: number
    imageHeight: number
    workerCount: number
    fallbackReason?: string
}

export interface RendererProgress {
    completedRows: number
    totalRows: number
    progress: number
}

interface RenderOptions {
    onProgress?: (progress: RendererProgress) => void
    onStats?: (stats: RendererStats) => void
    rowsPerChunk?: number
    signal?: AbortSignal
    mode?: RendererMode
}

const worldList = randomScene(createSeededRng(1337))
const world = new BvhNode(worldList.objects)
const offscreenCache = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>()
const WORLD_SEED = 1337

const cameraPreset = {
    vfov: 20,
    lookFrom: new Vec3(13, 2, 3),
    lookAt: new Vec3(0, 0, 0),
    vup: new Vec3(0, 1, 0),
    defocusAngle: 0.6,
    focusDist: 10,
}

export async function render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options?: RenderOptions
): Promise<void> {
    if (options?.signal?.aborted) {
        return
    }

    const startedAt = performance.now()
    const modeRequested = options?.mode ?? 'auto'

    const imageWidth = Math.max(320, Math.floor(width / 2))
    const imageHeight = Math.max(180, Math.floor(height / 2))

    const camera = new Camera({
        imageWidth,
        imageHeight,
        samplesPerPixel: 20,
        maxDepth: 20,
        ...cameraPreset,
    })

    const offscreen = getOrCreateOffscreen(ctx, imageWidth, imageHeight)
    const offscreenCtx = offscreen.getContext('2d')
    if (!offscreenCtx) {
        return
    }

    const workerResult = modeRequested === 'single'
        ? { rendered: false, workerCount: 0, reason: 'Forced single-thread mode' }
        : await tryRenderWithWorkers(
        ctx,
        offscreenCtx,
        width,
        height,
        imageWidth,
        imageHeight,
        options,
    )

    if (workerResult.rendered || options?.signal?.aborted) {
        if (!options?.signal?.aborted) {
            options?.onStats?.({
                modeRequested,
                modeUsed: 'workers',
                durationMs: performance.now() - startedAt,
                imageWidth,
                imageHeight,
                workerCount: workerResult.workerCount,
            })
        }
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

    options?.onStats?.({
        modeRequested,
        modeUsed: 'single',
        durationMs: performance.now() - startedAt,
        imageWidth,
        imageHeight,
        workerCount: 0,
        fallbackReason: workerResult.reason,
    })
}

interface WorkerStripeRequest {
    type: 'render-stripe'
    jobId: number
    seed: number
    imageWidth: number
    imageHeight: number
    rowStart: number
    rowEnd: number
    samplesPerPixel: number
    maxDepth: number
    vfov: number
    lookFrom: [number, number, number]
    lookAt: [number, number, number]
    vup: [number, number, number]
    defocusAngle: number
    focusDist: number
}

interface WorkerStripeResponse {
    type: 'stripe-complete'
    jobId: number
    rowStart: number
    rowEnd: number
    data: ArrayBuffer
}

async function tryRenderWithWorkers(
    ctx: CanvasRenderingContext2D,
    offscreenCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    imageWidth: number,
    imageHeight: number,
    options?: RenderOptions,
): Promise<{ rendered: boolean; workerCount: number; reason?: string }> {
    if (typeof Worker === 'undefined' || typeof navigator === 'undefined') {
        return { rendered: false, workerCount: 0, reason: 'Worker API unavailable in this runtime' }
    }

    const cpuCount = navigator.hardwareConcurrency ?? 4
    const workerCount = Math.max(1, Math.min(8, cpuCount - 1, imageHeight))
    if (workerCount <= 1) {
        return { rendered: false, workerCount, reason: 'Not enough CPU cores for worker fan-out' }
    }

    const jobs = buildStripeJobs(imageHeight, workerCount)
    if (jobs.length <= 1) {
        return { rendered: false, workerCount, reason: 'Image too small for stripe parallelism' }
    }

    const finalImage = new ImageData(imageWidth, imageHeight)
    const workers: Worker[] = []

    return new Promise<boolean>((resolve, reject) => {
        let completedRows = 0
        let completedJobs = 0
        let done = false

        const cleanup = () => {
            while (workers.length > 0) {
                workers.pop()?.terminate()
            }
            options?.signal?.removeEventListener('abort', onAbort)
        }

        const finish = (result: boolean) => {
            if (done) return
            done = true
            cleanup()
            resolve(result)
        }

        const fail = (error: unknown) => {
            if (done) return
            done = true
            cleanup()
            reject(error)
        }

        const onAbort = () => finish(false)
        options?.signal?.addEventListener('abort', onAbort)

        jobs.forEach((job, index) => {
            const worker = new Worker(new URL('./renderWorker.ts', import.meta.url), {
                type: 'module',
            })
            workers.push(worker)

            worker.onmessage = (event: MessageEvent<WorkerStripeResponse>) => {
                if (done || options?.signal?.aborted) {
                    return
                }

                const data = event.data
                if (data.type !== 'stripe-complete') {
                    return
                }

                const stripeHeight = data.rowEnd - data.rowStart
                copyStripeToImage(
                    finalImage,
                    new Uint8ClampedArray(data.data),
                    imageWidth,
                    data.rowStart,
                    stripeHeight,
                )

                completedRows += stripeHeight
                completedJobs += 1

                const progress = {
                    completedRows,
                    totalRows: imageHeight,
                    progress: completedRows / imageHeight,
                }
                options?.onProgress?.(progress)
                drawScaled(ctx, offscreenCtx, finalImage, width, height)

                if (completedJobs === jobs.length) {
                    finish(true)
                }
            }

            worker.onerror = (error) => {
                fail(error)
            }

            const payload: WorkerStripeRequest = {
                type: 'render-stripe',
                jobId: index,
                seed: WORLD_SEED,
                imageWidth,
                imageHeight,
                rowStart: job.rowStart,
                rowEnd: job.rowEnd,
                samplesPerPixel: 20,
                maxDepth: 20,
                vfov: cameraPreset.vfov,
                lookFrom: [cameraPreset.lookFrom.x, cameraPreset.lookFrom.y, cameraPreset.lookFrom.z],
                lookAt: [cameraPreset.lookAt.x, cameraPreset.lookAt.y, cameraPreset.lookAt.z],
                vup: [cameraPreset.vup.x, cameraPreset.vup.y, cameraPreset.vup.z],
                defocusAngle: cameraPreset.defocusAngle,
                focusDist: cameraPreset.focusDist,
            }

            worker.postMessage(payload)
        })
    }).then((rendered) => {
        if (rendered) {
            return { rendered: true, workerCount }
        }

        return { rendered: false, workerCount, reason: 'Worker render aborted before completion' }
    }).catch(() => ({
        rendered: false,
        workerCount,
        reason: 'Worker error during rendering',
    }))
}

function copyStripeToImage(
    destination: ImageData,
    stripeData: Uint8ClampedArray,
    imageWidth: number,
    rowStart: number,
    stripeHeight: number,
): void {
    const rowSize = imageWidth * 4

    for (let row = 0; row < stripeHeight; row++) {
        const srcStart = row * rowSize
        const srcEnd = srcStart + rowSize
        const destStart = ((rowStart + row) * imageWidth) * 4
        destination.data.set(stripeData.subarray(srcStart, srcEnd), destStart)
    }
}

function buildStripeJobs(imageHeight: number, workerCount: number): Array<{ rowStart: number; rowEnd: number }> {
    const jobs: Array<{ rowStart: number; rowEnd: number }> = []
    const rowsPerJob = Math.ceil(imageHeight / workerCount)

    for (let rowStart = 0; rowStart < imageHeight; rowStart += rowsPerJob) {
        const rowEnd = Math.min(imageHeight, rowStart + rowsPerJob)
        jobs.push({ rowStart, rowEnd })
    }

    return jobs
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
