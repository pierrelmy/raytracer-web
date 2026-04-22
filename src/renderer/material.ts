import Vec3, { dot, randomDouble, reflect, refract, type Color } from '../core/vec3'
import Ray from './ray'
import { HitRecord } from './hittable'

export interface ScatterResult {
    attenuation: Color
    scattered: Ray
}

export interface Material {
    scatter(rayIn: Ray, rec: HitRecord): ScatterResult | null
}

export class Lambertian implements Material {
    albedo: Color

    constructor(albedo: Color) {
        this.albedo = albedo
    }

    scatter(_: Ray, rec: HitRecord): ScatterResult {
        let scatterDirection = rec.normal.add(Vec3.randomUnitVector())

        if (scatterDirection.nearZero()) {
            scatterDirection = rec.normal
        }

        return {
            attenuation: this.albedo,
            scattered: new Ray(rec.p, scatterDirection),
        }
    }
}

export class Metal implements Material {
    albedo: Color
    fuzz: number

    constructor(albedo: Color, fuzz: number) {
        this.albedo = albedo
        this.fuzz = fuzz < 1 ? fuzz : 1
    }

    scatter(rayIn: Ray, rec: HitRecord): ScatterResult | null {
        const reflected = reflect(rayIn.direction.normalize(), rec.normal)
        const scatteredDirection = reflected.add(Vec3.randomUnitVector().mul(this.fuzz))
        const scattered = new Ray(rec.p, scatteredDirection)

        if (dot(scattered.direction, rec.normal) <= 0) {
            return null
        }

        return {
            attenuation: this.albedo,
            scattered,
        }
    }
}

export class Dielectric implements Material {
    refractionIndex: number

    constructor(refractionIndex: number) {
        this.refractionIndex = refractionIndex
    }

    scatter(rayIn: Ray, rec: HitRecord): ScatterResult {
        const attenuation = new Vec3(1.0, 1.0, 1.0)
        const ri = rec.frontFace ? (1.0 / this.refractionIndex) : this.refractionIndex

        const unitDirection = rayIn.direction.normalize()
        const cosTheta = Math.min(dot(unitDirection.neg(), rec.normal), 1.0)
        const sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta)

        const cannotRefract = ri * sinTheta > 1.0
        let direction: Vec3

        if (cannotRefract || this.reflectance(cosTheta, ri) > randomDouble()) {
            direction = reflect(unitDirection, rec.normal)
        } else {
            direction = refract(unitDirection, rec.normal, ri)
        }

        return {
            attenuation,
            scattered: new Ray(rec.p, direction),
        }
    }

    private reflectance(cosine: number, refractionIndex: number): number {
        let r0 = (1 - refractionIndex) / (1 + refractionIndex)
        r0 = r0 * r0
        return r0 + (1 - r0) * Math.pow((1 - cosine), 5)
    }
}
