export type Rng = () => number

export function createSeededRng(seed: number): Rng {
    let state = (seed >>> 0) || 1

    return () => {
        state = (1664525 * state + 1013904223) >>> 0
        return state / 0x100000000
    }
}

export function randomBetween(rng: Rng, min: number, max: number): number {
    return min + (max - min) * rng()
}
