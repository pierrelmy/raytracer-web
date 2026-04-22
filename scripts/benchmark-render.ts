import { performance } from 'node:perf_hooks'
import Camera from '../src/renderer/camera'
import { createSeededRng } from '../src/core/rng'
import Vec3 from '../src/core/vec3'
import { randomScene } from '../src/renderer/scene'

type ImageDataCtor = new (width: number, height: number) => {
    data: Uint8ClampedArray
    width: number
    height: number
}

function installPolyfills(): void {
    if (typeof globalThis.ImageData === 'undefined') {
        class NodeImageData {
            data: Uint8ClampedArray
            width: number
            height: number

            constructor(width: number, height: number) {
                this.width = width
                this.height = height
                this.data = new Uint8ClampedArray(width * height * 4)
            }
        }

        ;(globalThis as { ImageData?: ImageDataCtor }).ImageData = NodeImageData
    }

    if (typeof globalThis.requestAnimationFrame === 'undefined') {
        globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
            return setTimeout(() => cb(performance.now()), 0) as unknown as number
        }) as typeof requestAnimationFrame
    }

    if (typeof globalThis.cancelAnimationFrame === 'undefined') {
        globalThis.cancelAnimationFrame = ((id: number) => {
            clearTimeout(id)
        }) as typeof cancelAnimationFrame
    }
}

function envNumber(name: string, fallback: number): number {
    const raw = process.env[name]
    if (!raw) return fallback
    const value = Number(raw)
    return Number.isFinite(value) ? value : fallback
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
}

async function run(): Promise<void> {
    installPolyfills()

    const runs = Math.max(1, Math.floor(envNumber('BENCH_RUNS', 10)))
    const warmupRuns = Math.max(0, Math.floor(envNumber('BENCH_WARMUP', 1)))
    const imageWidth = Math.max(64, Math.floor(envNumber('BENCH_WIDTH', 320)))
    const imageHeight = Math.max(64, Math.floor(envNumber('BENCH_HEIGHT', 180)))
    const samplesPerPixel = Math.max(1, Math.floor(envNumber('BENCH_SPP', 20)))
    const maxDepth = Math.max(1, Math.floor(envNumber('BENCH_DEPTH', 20)))
    const seed = Math.floor(envNumber('BENCH_SEED', 1337))

    const world = randomScene(createSeededRng(seed))

    const timings: number[] = []

    const runOnce = async (): Promise<number> => {
        const camera = new Camera({
            imageWidth,
            imageHeight,
            samplesPerPixel,
            maxDepth,
            vfov: 20,
            lookFrom: new Vec3(13, 2, 3),
            lookAt: new Vec3(0, 0, 0),
            vup: new Vec3(0, 1, 0),
            defocusAngle: 0.6,
            focusDist: 10,
        })

        const start = performance.now()
        await camera.render(world, { rowsPerChunk: imageHeight })
        const end = performance.now()
        return end - start
    }

    for (let i = 0; i < warmupRuns; i++) {
        await runOnce()
    }

    for (let i = 0; i < runs; i++) {
        const duration = await runOnce()
        timings.push(duration)
    }

    const min = Math.min(...timings)
    const max = Math.max(...timings)
    const avg = timings.reduce((sum, t) => sum + t, 0) / timings.length
    const med = median(timings)

    console.log('Render benchmark (deterministic scene)')
    console.log(`Config: ${imageWidth}x${imageHeight}, spp=${samplesPerPixel}, depth=${maxDepth}, seed=${seed}`)
    console.log(`Runs: ${runs} (warmup: ${warmupRuns})`)
    console.log(`min: ${min.toFixed(2)} ms`)
    console.log(`max: ${max.toFixed(2)} ms`)
    console.log(`avg: ${avg.toFixed(2)} ms`)
    console.log(`median: ${med.toFixed(2)} ms`)
}

run().catch((error: unknown) => {
    console.error('Benchmark failed:', error)
    process.exitCode = 1
})
