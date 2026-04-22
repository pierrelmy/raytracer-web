import Interval from './interval'
import type Ray from './ray'
import Aabb from './aabb'
import { HitRecord, type Hittable } from './hittable'

export default class BvhNode implements Hittable {
    left!: Hittable
    right!: Hittable
    boundingBox!: Aabb

    constructor(objects: Hittable[]) {
        if (objects.length === 0) {
            throw new Error('BVH requires at least one object')
        }

        const items = [...objects]
        this.build(items, 0, items.length)
    }

    private build(objects: Hittable[], start: number, end: number): void {
        const span = end - start
        const axis = longestAxis(objects, start, end)
        const comparator = boxCompare(axis)

        if (span === 1) {
            this.left = objects[start]
            this.right = objects[start]
        } else if (span === 2) {
            if (comparator(objects[start], objects[start + 1]) <= 0) {
                this.left = objects[start]
                this.right = objects[start + 1]
            } else {
                this.left = objects[start + 1]
                this.right = objects[start]
            }
        } else {
            objects.slice(start, end).sort(comparator).forEach((obj, index) => {
                objects[start + index] = obj
            })

            const mid = start + Math.floor(span / 2)
            this.left = new BvhNode(objects.slice(start, mid))
            this.right = new BvhNode(objects.slice(mid, end))
        }

        const boxLeft = this.left.boundingBox
        const boxRight = this.right.boundingBox
        this.boundingBox = Aabb.surroundingBox(boxLeft, boxRight)
    }

    hit(ray: Ray, rayT: Interval, rec: HitRecord): boolean {
        if (!this.boundingBox.hit(ray, rayT)) {
            return false
        }

        const hitLeft = this.left.hit(ray, rayT, rec)
        const rightInterval = new Interval(rayT.min, hitLeft ? rec.t : rayT.max)
        const hitRight = this.right.hit(ray, rightInterval, rec)

        return hitLeft || hitRight
    }
}

function longestAxis(objects: Hittable[], start: number, end: number): number {
    let box = objects[start].boundingBox

    for (let i = start + 1; i < end; i++) {
        box = Aabb.surroundingBox(box, objects[i].boundingBox)
    }

    const x = box.axisLength(0)
    const y = box.axisLength(1)
    const z = box.axisLength(2)

    if (x > y && x > z) return 0
    if (y > z) return 1
    return 2
}

function boxCompare(axis: number): (a: Hittable, b: Hittable) => number {
    return (a: Hittable, b: Hittable) => {
        return a.boundingBox.axisMin(axis) - b.boundingBox.axisMin(axis)
    }
}
