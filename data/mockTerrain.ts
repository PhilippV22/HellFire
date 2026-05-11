import type { TerrainFeature } from "@/types/terrain";

export const mockTerrainFeatures: TerrainFeature[] = [
  {
    id: "forest-black-forest",
    kind: "forest",
    name: "Black Forest",
    center: { latitude: 48.15, longitude: 8.2 },
    radiusLatitude: 2.1,
    radiusLongitude: 1.1,
    rotation: -18,
    density: "very-dense"
  },
  {
    id: "forest-ardennes",
    kind: "forest",
    name: "Ardennes Forest Belt",
    center: { latitude: 50.05, longitude: 5.6 },
    radiusLatitude: 1.4,
    radiusLongitude: 1.9,
    rotation: 18,
    density: "dense"
  },
  {
    id: "forest-amazon",
    kind: "forest",
    name: "Amazon Dense Forest",
    center: { latitude: -4.2, longitude: -61.5 },
    radiusLatitude: 7.8,
    radiusLongitude: 13.2,
    rotation: 8,
    density: "very-dense"
  },
  {
    id: "forest-congo",
    kind: "forest",
    name: "Congo Basin Forest",
    center: { latitude: -1.1, longitude: 22.4 },
    radiusLatitude: 5.6,
    radiusLongitude: 7.5,
    rotation: -7,
    density: "very-dense"
  },
  {
    id: "forest-southeast-asia",
    kind: "forest",
    name: "Southeast Asia Rainforest",
    center: { latitude: 10.7, longitude: 104.2 },
    radiusLatitude: 5.2,
    radiusLongitude: 7.8,
    rotation: 24,
    density: "dense"
  },
  {
    id: "river-rhine",
    kind: "river",
    name: "Rhine River Corridor",
    intensity: 2,
    coordinates: [
      { latitude: 47.6, longitude: 8.0 },
      { latitude: 48.6, longitude: 7.8 },
      { latitude: 49.7, longitude: 8.4 },
      { latitude: 50.1, longitude: 8.7 },
      { latitude: 51.2, longitude: 6.8 },
      { latitude: 52.0, longitude: 5.2 }
    ]
  },
  {
    id: "river-danube",
    kind: "river",
    name: "Danube River Corridor",
    intensity: 2,
    coordinates: [
      { latitude: 48.1, longitude: 8.2 },
      { latitude: 48.4, longitude: 11.5 },
      { latitude: 48.2, longitude: 16.4 },
      { latitude: 47.5, longitude: 19.1 },
      { latitude: 45.8, longitude: 21.2 },
      { latitude: 45.2, longitude: 29.6 }
    ]
  },
  {
    id: "river-amazon",
    kind: "river",
    name: "Amazon River Barrier",
    intensity: 3,
    coordinates: [
      { latitude: -3.7, longitude: -73.2 },
      { latitude: -3.4, longitude: -67.1 },
      { latitude: -3.1, longitude: -60.0 },
      { latitude: -2.3, longitude: -54.4 },
      { latitude: -1.5, longitude: -49.3 }
    ]
  },
  {
    id: "river-yangtze",
    kind: "river",
    name: "Yangtze River Corridor",
    intensity: 2,
    coordinates: [
      { latitude: 31.1, longitude: 104.1 },
      { latitude: 30.7, longitude: 108.5 },
      { latitude: 30.6, longitude: 114.3 },
      { latitude: 31.2, longitude: 118.8 },
      { latitude: 31.3, longitude: 121.4 }
    ]
  },
  {
    id: "ridge-alps",
    kind: "ridge",
    name: "Alpine High Ridge",
    intensity: 3,
    coordinates: [
      { latitude: 46.0, longitude: 6.5 },
      { latitude: 46.4, longitude: 8.8 },
      { latitude: 46.8, longitude: 10.7 },
      { latitude: 47.1, longitude: 12.4 },
      { latitude: 47.3, longitude: 14.1 }
    ]
  },
  {
    id: "ridge-himalaya",
    kind: "ridge",
    name: "Himalaya Elevation Wall",
    intensity: 3,
    coordinates: [
      { latitude: 34.0, longitude: 73.1 },
      { latitude: 32.7, longitude: 78.8 },
      { latitude: 30.6, longitude: 84.7 },
      { latitude: 28.4, longitude: 90.1 },
      { latitude: 27.9, longitude: 95.2 }
    ]
  },
  {
    id: "cliff-japan",
    kind: "cliff",
    name: "Japan Mountain Spine",
    intensity: 2,
    coordinates: [
      { latitude: 43.0, longitude: 141.0 },
      { latitude: 39.5, longitude: 140.4 },
      { latitude: 36.2, longitude: 138.9 },
      { latitude: 34.4, longitude: 136.8 }
    ]
  },
  {
    id: "highland-blue-mountains",
    kind: "highland",
    name: "Blue Mountains Escarpment",
    intensity: 2,
    coordinates: [
      { latitude: -33.3, longitude: 150.2 },
      { latitude: -33.7, longitude: 150.4 },
      { latitude: -34.0, longitude: 150.7 }
    ]
  },
  {
    id: "cliff-andes",
    kind: "cliff",
    name: "Andes Cliff Belt",
    intensity: 3,
    coordinates: [
      { latitude: 4.5, longitude: -75.0 },
      { latitude: -5.4, longitude: -78.2 },
      { latitude: -13.6, longitude: -72.5 },
      { latitude: -22.9, longitude: -67.8 },
      { latitude: -34.5, longitude: -70.6 }
    ]
  }
];
