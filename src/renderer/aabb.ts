import type Ray from './ray'
import Interval from './interval'

export default class Aabb {
    x: Interval
    y: Interval
    z: Interval

    constructor(x: Interval, y: Interval, z: Interval) {
        this.x = x
        this.y = y
        this.z = z
    }

    hit(ray: Ray, rayT: Interval): boolean {
        let tMin = rayT.min
        let tMax = rayT.max

        const axes: Array<[number, number, Interval]> = [
            [ray.origin.x, ray.direction.x, this.x],
            [ray.origin.y, ray.direction.y, this.y],
            [ray.origin.z, ray.direction.z, this.z],
        ]

        for (const [origin, direction, axisInterval] of axes) {
            const invD = 1.0 / direction
            let t0 = (axisInterval.min - origin) * invD
            let t1 = (axisInterval.max - origin) * invD

            if (invD < 0.0) {
                const temp = t0
                t0 = t1
                t1 = temp
            }

            if (t0 > tMin) tMin = t0
            if (t1 < tMax) tMax = t1

            if (tMax <= tMin) {
                return false
            }
        }

        return true
    }

    axisMin(axis: number): number {
        if (axis === 0) return this.x.min
        if (axis === 1) return this.y.min
        return this.z.min
    }

    axisLength(axis: number): number {
        if (axis === 0) return this.x.max - this.x.min
        if (axis === 1) return this.y.max - this.y.min
        return this.z.max - this.z.min
    }

    static surroundingBox(box0: Aabb, box1: Aabb): Aabb {
        const smallX = Math.min(box0.x.min, box1.x.min)
        const smallY = Math.min(box0.y.min, box1.y.min)
        const smallZ = Math.min(box0.z.min, box1.z.min)

        const bigX = Math.max(box0.x.max, box1.x.max)
        const bigY = Math.max(box0.y.max, box1.y.max)
        const bigZ = Math.max(box0.z.max, box1.z.max)

        return new Aabb(
            new Interval(smallX, bigX),
            new Interval(smallY, bigY),
            new Interval(smallZ, bigZ),
        )
    }
}
