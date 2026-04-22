import type { Color } from './vec3'

export function writeColor(pixelColor: Color): [number, number, number] {
    const r = Math.trunc(255.999 * pixelColor.x)
    const g = Math.trunc(255.999 * pixelColor.y)
    const b = Math.trunc(255.999 * pixelColor.z)
    return [r, g, b]
}
