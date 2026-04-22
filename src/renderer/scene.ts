import Vec3 from '../core/vec3'
import HittableList from './hittableList'
import { Dielectric, Lambertian, Metal } from './material'
import Sphere from './sphere'

export function randomScene(): HittableList {
    const world = new HittableList()

    const groundMaterial = new Lambertian(new Vec3(0.5, 0.5, 0.5))
    world.add(new Sphere(new Vec3(0, -1000, 0), 1000, groundMaterial))

    for (let a = -11; a < 11; a++) {
        for (let b = -11; b < 11; b++) {
            const chooseMat = Math.random()
            const center = new Vec3(a + 0.9 * Math.random(), 0.2, b + 0.9 * Math.random())

            if (center.sub(new Vec3(4, 0.2, 0)).length() > 0.9) {
                if (chooseMat < 0.8) {
                    const albedo = Vec3.random().mul(Vec3.random())
                    world.add(new Sphere(center, 0.2, new Lambertian(albedo)))
                } else if (chooseMat < 0.95) {
                    const albedo = Vec3.random(0.5, 1)
                    const fuzz = Math.random() * 0.5
                    world.add(new Sphere(center, 0.2, new Metal(albedo, fuzz)))
                } else {
                    world.add(new Sphere(center, 0.2, new Dielectric(1.5)))
                }
            }
        }
    }

    world.add(new Sphere(new Vec3(0, 1, 0), 1.0, new Dielectric(1.5)))
    world.add(new Sphere(new Vec3(-4, 1, 0), 1.0, new Lambertian(new Vec3(0.4, 0.2, 0.1))))
    world.add(new Sphere(new Vec3(4, 1, 0), 1.0, new Metal(new Vec3(0.7, 0.6, 0.5), 0.0)))

    return world
}
