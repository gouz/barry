# barry

## Pré-requis

[Bun](https://bun.com)

## Installation

```
bun install
```

## Utilisation

- `bun dev` lance l'environnement de développement.
- `bun run build` vérifie les types puis génère le site statique dans `docs/`.
- `bun run lint` / `bun run format` : contrôle et correction via Biome.
- `bun run typecheck` : TypeScript seul.

## Architecture

```
src/
  api/      appels à la Géoplateforme IGN (géocodage, itinéraires)
  compute/  calcul du point de rencontre, sans dépendance au DOM
  map/      rendu OpenLayers
  ui/       formulaire, journal, permalien, interrupteurs
  state.ts  état applicatif
```

## Informations

Cet outil est développé avec [OpenLayers](https://openlayers.org/) et la
[Géoplateforme IGN](https://geoservices.ign.fr/documentation/services/services-geoplateforme).
