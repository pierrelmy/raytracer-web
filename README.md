# Raytracer Web (TypeScript + React)

Ce projet implemente un raytracer CPU dans le navigateur, base sur le tutoriel:
Ray Tracing in One Weekend
https://raytracing.github.io/books/RayTracingInOneWeekend.html

## Fonctionnalites implementees

- Vecteurs 3D complets (produit scalaire, produit vectoriel, normalisation, reflection, refraction)
- Rayons et intersections rayon/sphere
- Monde de hittables avec recherche du hit le plus proche
- Materiaux:
  - Lambertian (diffus)
  - Metal (reflexion floue)
  - Dielectric (verre, refraction + Fresnel Schlick)
- Camera physique:
  - champ de vision
  - profondeur de champ (defocus blur)
  - anti-aliasing multi-samples
- Integrateur recursif avec profondeur max
- Scene aleatoire proche de la scene finale du livre
- Rendu CPU sur canvas 2D

## Lancer le projet

```bash
npm install
npm run dev
```

Build de production:

```bash
npm run build
```

## Reglages principaux

Les parametres de rendu sont dans `src/renderer/cpuRenderer.ts`:

- `samplesPerPixel`: qualite/bruit
- `maxDepth`: nombre max de rebonds
- `defocusAngle`: intensite du flou de profondeur de champ
- `focusDist`: distance de mise au point
- camera `lookFrom` / `lookAt` / `vfov`

La generation de la scene est dans `src/renderer/scene.ts`.

## Notes performance

Le rendu est volontairement limite a une resolution interne reduite puis upscale pour rester fluide dans le navigateur.
