import type { Material } from './material'
import type { Point3 } from '../core/vec3'
import Vec3, { dot } from '../core/vec3'
import type Ray from './ray'
import type Interval from './interval'

export class HitRecord {
    p: Point3
    normal: Vec3
    material: Material
    t: number
    frontFace: boolean

    constructor() {
        this.p = new Vec3()
        this.normal = new Vec3()
        this.t = 0
        this.frontFace = false
        this.material = {
            scatter: () => null,
        }
    }

    setFaceNormal(ray: Ray, outwardNormal: Vec3): void {
        this.frontFace = dot(ray.direction, outwardNormal) < 0
        this.normal = this.frontFace ? outwardNormal : outwardNormal.neg()
    }
}

export interface Hittable {
    hit(ray: Ray, rayT: Interval, rec: HitRecord): boolean
}
