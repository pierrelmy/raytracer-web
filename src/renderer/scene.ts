import Vec3 from '../core/vec3'
import { randomBetween, type Rng } from '../core/rng'
import HittableList from './hittableList'
import { Dielectric, Lambertian, Metal } from './material'
import Sphere from './sphere'

function randomVec3(rng: Rng, min = 0, max = 1): Vec3 {
    return new Vec3(
        randomBetween(rng, min, max),
        randomBetween(rng, min, max),
        randomBetween(rng, min, max),
    )
}

export function randomScene(rng: Rng = Math.random): HittableList {
    const world = new HittableList()

    const groundMaterial = new Lambertian(new Vec3(0.5, 0.5, 0.5))
    world.add(new Sphere(new Vec3(0, -1000, 0), 1000, groundMaterial))

    for (let a = -11; a < 11; a++) {
        for (let b = -11; b < 11; b++) {
            const chooseMat = rng()
            const center = new Vec3(a + 0.9 * rng(), 0.2, b + 0.9 * rng())

            if (center.sub(new Vec3(4, 0.2, 0)).length() > 0.9) {
                if (chooseMat < 0.8) {
                    const albedo = randomVec3(rng).mul(randomVec3(rng))
                    world.add(new Sphere(center, 0.2, new Lambertian(albedo)))
                } else if (chooseMat < 0.95) {
                    const albedo = randomVec3(rng, 0.5, 1)
                    const fuzz = randomBetween(rng, 0, 0.5)
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
