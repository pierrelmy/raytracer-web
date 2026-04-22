export type Point3 = Vec3
export type Color = Vec3

export default class Vec3
{

    x: number
    y: number
    z: number

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x
        this.y = y
        this.z = z
        return this
    }

    add(other: Vec3): Vec3 {
        return new Vec3(
            this.x + other.x,
            this.y + other.y,
            this.z + other.z
        )
    }

    sub(other: Vec3): Vec3 {
        return new Vec3(
            this.x - other.x,
            this.y - other.y,
            this.z - other.z
        )
    }

    mul(t: Vec3 | number): Vec3 {
        if (typeof t == "number") {
            return new Vec3 (
                this.x * t,
                this.y * t,
                this.z * t
            )
        }
        return new Vec3(
            this.x * t.x,
            this.y * t.y,
            this.z * t.z
        )
    }

    neg(): Vec3 {
        return new Vec3(
            - this.x,
            - this.y,
            - this.z
        )
    }

    divideBy(t: number): Vec3 {
        return this.mul(1/t)
    }

    normalize(): Vec3 {
        return this.divideBy(this.length())
    }

    length(): number {
        return Math.sqrt(this.lengthSquared())
    }

    lengthSquared(): number {
        return this.x * this.x
             + this.y * this.y
             + this.z * this.z
    }

    nearZero(): boolean {
        const s = 1e-8
        return Math.abs(this.x) < s && Math.abs(this.y) < s && Math.abs(this.z) < s
    }

    static random(min = 0, max = 1): Vec3 {
        return new Vec3(
            randomDouble(min, max),
            randomDouble(min, max),
            randomDouble(min, max)
        )
    }

    static randomInUnitSphere(): Vec3 {
        const direction = Vec3.randomUnitVector()
        const radius = Math.cbrt(randomDouble())
        return direction.mul(radius)
    }

    static randomUnitVector(): Vec3 {
        const z = randomDouble(-1, 1)
        const azimuth = randomDouble(0, 2 * Math.PI)
        const r = Math.sqrt(1 - z * z)
        return new Vec3(r * Math.cos(azimuth), r * Math.sin(azimuth), z)
    }

    static randomOnHemisphere(normal: Vec3): Vec3 {
        const onUnitSphere = Vec3.randomUnitVector()
        if (dot(onUnitSphere, normal) > 0.0) {
            return onUnitSphere
        }
        return onUnitSphere.neg()
    }

    static randomInUnitDisk(): Vec3 {
        const radius = Math.sqrt(randomDouble())
        const azimuth = randomDouble(0, 2 * Math.PI)
        return new Vec3(radius * Math.cos(azimuth), radius * Math.sin(azimuth), 0)
    }
}

export function randomDouble(min = 0, max = 1): number {
    return min + (max - min) * Math.random()
}

export function dot(u: Vec3, v: Vec3): number {
    return u.x * v.x
         + u.y * v.y
         + u.z * v.z
}

export function cross(u: Vec3, v: Vec3): Vec3 {
    return new Vec3(
        u.y * v.z - u.z * v.y,
        u.z * v.x - u.x * v.z,
        u.x * v.y - u.y * v.x
    )
}

export function unitVector(v: Vec3): Vec3 {
    return v.divideBy(v.length())
}

export function reflect(v: Vec3, n: Vec3): Vec3 {
    return v.sub(n.mul(2 * dot(v, n)))
}

export function refract(uv: Vec3, n: Vec3, etaiOverEtat: number): Vec3 {
    const cosTheta = Math.min(dot(uv.neg(), n), 1.0)
    const rOutPerp = uv.add(n.mul(cosTheta)).mul(etaiOverEtat)
    const rOutParallel = n.mul(-Math.sqrt(Math.abs(1.0 - rOutPerp.lengthSquared())))
    return rOutPerp.add(rOutParallel)
}
