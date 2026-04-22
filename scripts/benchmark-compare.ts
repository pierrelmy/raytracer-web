/// <reference types="node" />

import { readFile } from 'node:fs/promises'

type BenchmarkResult = {
    config: {
        width: number
        height: number
        spp: number
        depth: number
        seed: number
        runs: number
        warmupRuns: number
    }
    stats: {
        minMs: number
        maxMs: number
        avgMs: number
        medianMs: number
    }
    timingsMs: number[]
    generatedAt: string
}

function envNumber(name: string, fallback: number): number {
    const raw = process.env[name]
    if (!raw) return fallback
    const value = Number(raw)
    return Number.isFinite(value) ? value : fallback
}

async function readResult(path: string): Promise<BenchmarkResult> {
    const content = await readFile(path, 'utf8')
    return JSON.parse(content) as BenchmarkResult
}

async function run(): Promise<void> {
    const baselinePath = process.env.BENCH_BASELINE_PATH ?? 'benchmarks/render-baseline.json'
    const currentPath = process.env.BENCH_CURRENT_PATH ?? 'benchmarks/render-current.json'
    const maxRegressionPercent = envNumber('BENCH_MAX_REGRESSION_PERCENT', 10)

    const baseline = await readResult(baselinePath)
    const current = await readResult(currentPath)

    const baselineMedian = baseline.stats.medianMs
    const currentMedian = current.stats.medianMs
    const delta = currentMedian - baselineMedian
    const deltaPercent = (delta / baselineMedian) * 100

    console.log('Render benchmark comparison')
    console.log(`Baseline: ${baselineMedian.toFixed(2)} ms (${baselinePath})`)
    console.log(`Current : ${currentMedian.toFixed(2)} ms (${currentPath})`)
    console.log(`Delta   : ${delta.toFixed(2)} ms (${deltaPercent.toFixed(2)}%)`)
    console.log(`Allowed regression: +${maxRegressionPercent.toFixed(2)}%`)

    if (deltaPercent > maxRegressionPercent) {
        console.error('Performance regression threshold exceeded.')
        process.exitCode = 1
        return
    }

    console.log('OK: performance is within threshold.')
}

run().catch((error: unknown) => {
    console.error('Benchmark comparison failed:', error)
    process.exitCode = 1
})
