export default class Interval {
    min: number
    max: number

    constructor(min: number, max: number) {
        this.min = min
        this.max = max
    }

    surrounds(x: number): boolean {
        return this.min < x && x < this.max
    }

    clamp(x: number): number {
        if (x < this.min) return this.min
        if (x > this.max) return this.max
        return x
    }
}
