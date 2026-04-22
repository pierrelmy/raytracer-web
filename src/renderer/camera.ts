import Vec3, { cross, randomDouble, unitVector, type Color, type Point3 } from '../core/vec3'
import Interval from './interval'
import Ray from './ray'
import HittableList from './hittableList'
import { HitRecord } from './hittable'

interface CameraConfig {
    imageWidth: number
    imageHeight: number
    samplesPerPixel: number
    maxDepth: number
    vfov: number
    lookFrom: Point3
    lookAt: Point3
    vup: Vec3
    defocusAngle: number
    focusDist: number
}

export interface RenderProgress {
    completedRows: number
    totalRows: number
    progress: number
}

interface RenderOptions {
    onProgress?: (progress: RenderProgress) => void
    onChunk?: (image: ImageData, progress: RenderProgress) => void
    rowsPerChunk?: number
    signal?: AbortSignal
}

export default class Camera {
    private imageWidth: number
    private imageHeight: number
    private samplesPerPixel: number
    private maxDepth: number

    private center: Point3
    private pixel00Loc: Point3
    private pixelDeltaU: Vec3
    private pixelDeltaV: Vec3

    private u: Vec3
    private v: Vec3
    private w: Vec3

    private defocusDiskU: Vec3
    private defocusDiskV: Vec3

    constructor(config: CameraConfig) {
        this.imageWidth = config.imageWidth
        this.imageHeight = config.imageHeight
        this.samplesPerPixel = config.samplesPerPixel
        this.maxDepth = config.maxDepth

        this.center = config.lookFrom

        const theta = degreesToRadians(config.vfov)
        const h = Math.tan(theta / 2)
        const viewportHeight = 2 * h * config.focusDist
        const viewportWidth = viewportHeight * (this.imageWidth / this.imageHeight)

        this.w = unitVector(config.lookFrom.sub(config.lookAt))
        this.u = unitVector(cross(config.vup, this.w))
        this.v = cross(this.w, this.u)

        const viewportU = this.u.mul(viewportWidth)
        const viewportV = this.v.neg().mul(viewportHeight)

        this.pixelDeltaU = viewportU.divideBy(this.imageWidth)
        this.pixelDeltaV = viewportV.divideBy(this.imageHeight)

        const viewportUpperLeft = this.center
            .sub(this.w.mul(config.focusDist))
            .sub(viewportU.divideBy(2))
            .sub(viewportV.divideBy(2))

        this.pixel00Loc = viewportUpperLeft
            .add(this.pixelDeltaU.add(this.pixelDeltaV).mul(0.5))

        const defocusRadius = config.focusDist * Math.tan(degreesToRadians(config.defocusAngle / 2))
        this.defocusDiskU = this.u.mul(defocusRadius)
        this.defocusDiskV = this.v.mul(defocusRadius)
    }

    async render(world: HittableList, options?: RenderOptions): Promise<ImageData> {
        const image = new ImageData(this.imageWidth, this.imageHeight)
        const scale = 1.0 / this.samplesPerPixel
        const reportProgress = options?.onProgress
        const reportChunk = options?.onChunk
        const rowsPerChunk = Math.max(1, options?.rowsPerChunk ?? 2)

        reportProgress?.({
            completedRows: 0,
            totalRows: this.imageHeight,
            progress: 0,
        })

        for (let j = 0; j < this.imageHeight; j++) {
            if (options?.signal?.aborted) {
                break
            }

            for (let i = 0; i < this.imageWidth; i++) {
                let pixelColor = new Vec3(0, 0, 0)

                for (let sample = 0; sample < this.samplesPerPixel; sample++) {
                    const ray = this.getRay(i, j)
                    pixelColor = pixelColor.add(this.rayColor(ray, this.maxDepth, world))
                }

                const color = pixelColor.mul(scale)
                const rgba = colorToRgba(color)
                const index = (j * this.imageWidth + i) * 4
                image.data[index] = rgba[0]
                image.data[index + 1] = rgba[1]
                image.data[index + 2] = rgba[2]
                image.data[index + 3] = 255
            }

            const progress = {
                completedRows: j + 1,
                totalRows: this.imageHeight,
                progress: (j + 1) / this.imageHeight,
            }

            reportProgress?.(progress)

            const shouldFlush = ((j + 1) % rowsPerChunk === 0) || (j + 1 === this.imageHeight)
            if (shouldFlush) {
                reportChunk?.(image, progress)
                await nextFrame()
            }
        }

        return image
    }

    private getRay(i: number, j: number): Ray {
        const offset = sampleSquare()
        const pixelSample = this.pixel00Loc
            .add(this.pixelDeltaU.mul(i + offset.x))
            .add(this.pixelDeltaV.mul(j + offset.y))

        const rayOrigin = (this.defocusDiskU.lengthSquared() > 0)
            ? this.defocusDiskSample()
            : this.center
        const rayDirection = pixelSample.sub(rayOrigin)

        return new Ray(rayOrigin, rayDirection)
    }

    private defocusDiskSample(): Point3 {
        const p = Vec3.randomInUnitDisk()
        return this.center
            .add(this.defocusDiskU.mul(p.x))
            .add(this.defocusDiskV.mul(p.y))
    }

    private rayColor(ray: Ray, depth: number, world: HittableList): Color {
        let currentRay = ray
        let attenuation = new Vec3(1, 1, 1)
        const rec = new HitRecord()
        const rayInterval = new Interval(0.001, Infinity)

        for (let bounce = 0; bounce < depth; bounce++) {
            if (!world.hit(currentRay, rayInterval, rec)) {
                const unitDirection = unitVector(currentRay.direction)
                const a = 0.5 * (unitDirection.y + 1.0)
                const sky = new Vec3(1.0 - 0.5 * a, 1.0 - 0.3 * a, 1.0)
                return attenuation.mul(sky)
            }

            const scatterResult = rec.material.scatter(currentRay, rec)
            if (!scatterResult) {
                return new Vec3(0, 0, 0)
            }

            attenuation = attenuation.mul(scatterResult.attenuation)
            if (isAttenuationNegligible(attenuation)) {
                return new Vec3(0, 0, 0)
            }

            currentRay = scatterResult.scattered
        }

        return new Vec3(0, 0, 0)
    }
}

function isAttenuationNegligible(attenuation: Color): boolean {
    return attenuation.x < 1e-3 && attenuation.y < 1e-3 && attenuation.z < 1e-3
}

function sampleSquare(): Vec3 {
    return new Vec3(randomDouble() - 0.5, randomDouble() - 0.5, 0)
}

function linearToGamma(value: number): number {
    if (value > 0) {
        return Math.sqrt(value)
    }
    return 0
}

function colorToRgba(color: Color): [number, number, number] {
    const intensity = new Interval(0, 0.999)
    const r = intensity.clamp(linearToGamma(color.x))
    const g = intensity.clamp(linearToGamma(color.y))
    const b = intensity.clamp(linearToGamma(color.z))

    return [
        Math.floor(256 * r),
        Math.floor(256 * g),
        Math.floor(256 * b),
    ]
}

function degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180
}

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve())
    })
}
