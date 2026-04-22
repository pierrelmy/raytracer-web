import Interval from './interval'
import type Ray from './ray'
import { HitRecord, type Hittable } from './hittable'

export default class HittableList implements Hittable {
    objects: Hittable[]

    constructor(objects: Hittable[] = []) {
        this.objects = objects
    }

    clear(): void {
        this.objects = []
    }

    add(object: Hittable): void {
        this.objects.push(object)
    }

    hit(ray: Ray, rayT: Interval, rec: HitRecord): boolean {
        const tempRec = new HitRecord()
        let hitAnything = false
        let closestSoFar = rayT.max

        for (const object of this.objects) {
            if (object.hit(ray, new Interval(rayT.min, closestSoFar), tempRec)) {
                hitAnything = true
                closestSoFar = tempRec.t
                rec.p = tempRec.p
                rec.normal = tempRec.normal
                rec.t = tempRec.t
                rec.frontFace = tempRec.frontFace
                rec.material = tempRec.material
            }
        }

        return hitAnything
    }
}
