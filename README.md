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

Deux pages partagent le même calcul et la même interface, et ne diffèrent que
par les services interrogés et la langue :

- `/` — la France, sur les données de la Géoplateforme IGN ;
- `/world/` — le monde, sur Photon et OSRM, en anglais.

```
src/
  api/        client HTTP commun (cadence, relances, cache)
    world/    Photon (géocodage) et OSRM (itinéraires)
  compute/    calcul du point de rencontre, sans dépendance au DOM
  i18n/       les phrases des modules partagés, en français et en anglais
  map/        rendu OpenLayers
  ui/         formulaire, journal, permalien, interrupteurs
  state.ts    état applicatif
  main.ts     page France
  main-world.ts  page monde
```

Les modules de `compute/` et de `ui/` reçoivent leur fournisseur et leurs
phrases en paramètre : le calcul ne sait pas à quel service il parle, ni dans
quelle langue il s'explique.

## Informations

Cet outil est développé avec [OpenLayers](https://openlayers.org/), la
[Géoplateforme IGN](https://geoservices.ign.fr/documentation/services/services-geoplateforme),
[Photon](https://photon.komoot.io/) et [OSRM](https://project-osrm.org/).

Le serveur de démonstration d'OSRM ne sert que le profil voiture et n'accepte
aucune contrainte : la page monde ne propose donc ni le mode piéton ni
l'évitement des autoroutes. Il est offert à la communauté sans garantie, et
demande un usage mesuré — un serveur dédié serait à prévoir si le trafic de la
page monde devenait important.
