import Vec3 from '../core/vec3'
import type { Point3 } from '../core/vec3'

export default class Ray
{
    origin: Point3
    direction: Vec3

    constructor(origin: Point3 = new Vec3(), direction: Vec3 = new Vec3()) {
        this.origin = origin
        this.direction = direction
        return this
    }

    at(t: number): Point3 {
        return this.origin.add(this.direction.mul(t))
    }
}