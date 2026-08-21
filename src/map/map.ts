import { boundingExtent } from "ol/extent.js";
import Feature from "ol/Feature.js";
import GeoJSON from "ol/format/GeoJSON.js";
import type LineString from "ol/geom/LineString.js";
import Point from "ol/geom/Point.js";
import TileLayer from "ol/layer/Tile.js";
import VectorLayer from "ol/layer/Vector.js";
import Map from "ol/Map.js";
import { useGeographic } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector.js";
import Circle from "ol/style/Circle.js";
import Fill from "ol/style/Fill.js";
import Stroke from "ol/style/Stroke.js";
import Style from "ol/style/Style.js";
import View from "ol/View.js";
import { COLORS, FRANCE_BOX } from "../config.ts";
import type { Box, Coord, GeoJSONLineString } from "../types.ts";

/**
 * Toutes les entités vivent dans deux sources vectorielles (points et routes)
 * plutôt qu'une couche OpenLayers par entité : la carte ne recompose que deux
 * couches quel que soit le nombre d'adresses.
 */
const pointSource = new VectorSource<Feature<Point>>();
const roadSource = new VectorSource<Feature<LineString>>();

/** Style « vide » : masque une entité sans la retirer de la source. */
const HIDDEN: Style[] = [];

const geojson = new GeoJSON();
let map: Map | undefined;

export function initMap(target: HTMLElement): Map {
  useGeographic();
  map = new Map({
    target,
    layers: [
      new TileLayer({ source: new OSM() }),
      new VectorLayer({ source: roadSource }),
      new VectorLayer({ source: pointSource }),
    ],
    view: new View({ center: [2.213749, 46.927638], zoom: 2 }),
  });
  return map;
}

function requireMap(): Map {
  if (!map) throw new Error("initMap() n'a pas encore été appelé");
  return map;
}

/**
 * Pose un repère.
 *
 * Le liseré clair n'est pas décoratif : sans lui, un point sombre se perd dans
 * les zones denses du fond de carte.
 */
export function addPoint(
  id: string,
  [lon, lat]: Coord,
  color: string,
  radius = 6,
): void {
  removePoint(id);
  const feature = new Feature(new Point([lon, lat]));
  feature.setId(id);
  feature.setStyle(
    new Style({
      image: new Circle({
        radius,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: COLORS.halo, width: 2 }),
      }),
    }),
  );
  pointSource.addFeature(feature);
}

export function removePoint(id: string): void {
  const existing = pointSource.getFeatureById(id);
  if (existing) pointSource.removeFeature(existing);
}

/** `dashed` distingue une ligne droite provisoire d'un itinéraire réel. */
export function addRoad(
  id: string,
  geometry: GeoJSONLineString,
  color: string,
  width = 3,
  dashed = false,
): void {
  const existing = roadSource.getFeatureById(id);
  if (existing) roadSource.removeFeature(existing);

  const feature = new Feature(geojson.readGeometry(geometry) as LineString);
  feature.setId(id);
  const style = new Style({
    stroke: new Stroke({
      color,
      width,
      lineCap: "round",
      lineJoin: "round",
      lineDash: dashed ? [2, 8] : undefined,
    }),
  });
  feature.setStyle(style);
  // Mémorisés pour pouvoir rétablir ou accentuer le tracé (cf. highlightRoad).
  feature.set("baseStyle", style);
  feature.set(
    "highlightStyle",
    new Style({
      stroke: new Stroke({
        color: COLORS.highlight,
        width: width + 2,
        lineCap: "round",
        lineJoin: "round",
        lineDash: dashed ? [2, 8] : undefined,
      }),
    }),
  );
  roadSource.addFeature(feature);
}

/**
 * Met en avant une route : elle passe à la couleur d'accentuation et les autres
 * sont masquées le temps du survol. `null` rétablit l'affichage complet.
 */
export function highlightRoad(id: string | null): void {
  for (const feature of roadSource.getFeatures()) {
    if (id === null) {
      feature.setStyle(feature.get("baseStyle") as Style);
      continue;
    }
    feature.setStyle(
      feature.getId() === id
        ? (feature.get("highlightStyle") as Style)
        : HIDDEN,
    );
  }
}

export function clearAll(): void {
  pointSource.clear();
  roadSource.clear();
}

export function fitTo(box: Box = FRANCE_BOX): void {
  const [[latA, lonA], [latB, lonB]] = box;
  requireMap()
    .getView()
    .fit(
      boundingExtent([
        [lonA, latA],
        [lonB, latB],
      ]),
      {
        size: requireMap().getSize(),
        padding: [50, 50, 50, 50],
        duration: 2000,
      },
    );
}
