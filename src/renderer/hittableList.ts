import Interval from './interval'
import type Ray from './ray'
import Aabb from './aabb'
import { HitRecord, type Hittable } from './hittable'

export default class HittableList implements Hittable {
    objects: Hittable[]
    boundingBox: Aabb

    constructor(objects: Hittable[] = []) {
        this.objects = objects
        this.boundingBox = objects.length > 0
            ? objects.reduce((box, object) => Aabb.surroundingBox(box, object.boundingBox), objects[0].boundingBox)
            : new Aabb(new Interval(0, 0), new Interval(0, 0), new Interval(0, 0))
    }

    clear(): void {
        this.objects = []
        this.boundingBox = new Aabb(new Interval(0, 0), new Interval(0, 0), new Interval(0, 0))
    }

    add(object: Hittable): void {
        if (this.objects.length === 0) {
            this.boundingBox = object.boundingBox
        } else {
            this.boundingBox = Aabb.surroundingBox(this.boundingBox, object.boundingBox)
        }
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
