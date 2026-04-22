/// <reference lib="webworker" />

import Vec3 from '../core/vec3'
import { createSeededRng } from '../core/rng'
import Camera from './camera'
import BvhNode from './bvhNode'
import { randomScene } from './scene'

type WorkerRequest = {
    type: 'render-stripe'
    jobId: number
    seed: number
    imageWidth: number
    imageHeight: number
    rowStart: number
    rowEnd: number
    samplesPerPixel: number
    maxDepth: number
    vfov: number
    lookFrom: [number, number, number]
    lookAt: [number, number, number]
    vup: [number, number, number]
    defocusAngle: number
    focusDist: number
}

type WorkerResponse = {
    type: 'stripe-complete'
    jobId: number
    rowStart: number
    rowEnd: number
    data: ArrayBuffer
}

let cachedSeed: number | null = null
let cachedWorld: BvhNode | null = null

function getWorld(seed: number): BvhNode {
    if (cachedWorld && cachedSeed === seed) {
        return cachedWorld
    }

    const worldList = randomScene(createSeededRng(seed))
    cachedWorld = new BvhNode(worldList.objects)
    cachedSeed = seed
    return cachedWorld
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const message = event.data
    if (message.type !== 'render-stripe') {
        return
    }

    const world = getWorld(message.seed)
    const camera = new Camera({
        imageWidth: message.imageWidth,
        imageHeight: message.imageHeight,
        samplesPerPixel: message.samplesPerPixel,
        maxDepth: message.maxDepth,
        vfov: message.vfov,
        lookFrom: new Vec3(...message.lookFrom),
        lookAt: new Vec3(...message.lookAt),
        vup: new Vec3(...message.vup),
        defocusAngle: message.defocusAngle,
        focusDist: message.focusDist,
    })

    const stripe = await camera.renderRows(
        world,
        message.rowStart,
        message.rowEnd,
        { rowsPerChunk: Math.max(1, message.rowEnd - message.rowStart) }
    )

    const response: WorkerResponse = {
        type: 'stripe-complete',
        jobId: message.jobId,
        rowStart: message.rowStart,
        rowEnd: message.rowEnd,
        data: stripe.data.buffer,
    }

    self.postMessage(response, [response.data])
}
