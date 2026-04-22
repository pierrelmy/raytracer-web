import type Interval from './interval'
import type Ray from './ray'
import type { Point3 } from '../core/vec3'
import { dot } from '../core/vec3'
import type { Material } from './material'
import { HitRecord, type Hittable } from './hittable'

export default class Sphere implements Hittable {
    center: Point3
    radius: number
    material: Material

    constructor(center: Point3, radius: number, material: Material) {
        this.center = center
        this.radius = Math.max(0, radius)
        this.material = material
    }

    hit(ray: Ray, rayT: Interval, rec: HitRecord): boolean {
        const oc = this.center.sub(ray.origin)
        const a = ray.direction.lengthSquared()
        const h = dot(ray.direction, oc)
        const c = oc.lengthSquared() - this.radius * this.radius

        const discriminant = h * h - a * c
        if (discriminant < 0) {
            return false
        }

        const sqrtd = Math.sqrt(discriminant)

        let root = (h - sqrtd) / a
        if (!rayT.surrounds(root)) {
            root = (h + sqrtd) / a
            if (!rayT.surrounds(root)) {
                return false
            }
        }

        rec.t = root
        rec.p = ray.at(rec.t)
        const outwardNormal = rec.p.sub(this.center).divideBy(this.radius)
        rec.setFaceNormal(ray, outwardNormal)
        rec.material = this.material

        return true
    }
}
