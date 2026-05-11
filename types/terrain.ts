export type TerrainKind = "forest" | "river" | "ridge" | "cliff" | "highland";

export type TerrainCoordinate = {
  latitude: number;
  longitude: number;
};

export type ForestTerrainFeature = {
  id: string;
  kind: "forest";
  name: string;
  center: TerrainCoordinate;
  radiusLatitude: number;
  radiusLongitude: number;
  rotation: number;
  density: "dense" | "very-dense";
};

export type LinearTerrainFeature = {
  id: string;
  kind: "river" | "ridge" | "cliff" | "highland";
  name: string;
  coordinates: TerrainCoordinate[];
  intensity: 1 | 2 | 3;
};

export type TerrainFeature = ForestTerrainFeature | LinearTerrainFeature;
