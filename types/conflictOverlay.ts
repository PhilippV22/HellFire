export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type ConflictCountryOverlay = {
  country: string;
  eventCount: number;
  maxSeverity: number;
  confidence: number;
};

export type ConflictBorderLine = {
  country: string;
  rings: GeoPoint[][];
  intensity: number;
};

export type ConflictFrontlineOverlay = {
  id: string;
  name: string;
  country: string;
  coordinates: GeoPoint[];
  eventCount: number;
  confidence: number;
  updatedAt: string;
  source: string;
  description: string;
};

export type ConflictAdminRegionStatus =
  | "occupied-majority"
  | "conflict-affected";

export type ConflictAdminRegionOverlay = {
  id: string;
  name: string;
  country: string;
  status: ConflictAdminRegionStatus;
  rings: GeoPoint[][];
  occupationPercent?: number;
  eventCount: number;
  confidence: number;
  updatedAt: string;
  source: string;
  description: string;
};

export type ConflictOverlayData = {
  countries: ConflictCountryOverlay[];
  borderLines: ConflictBorderLine[];
  adminRegions: ConflictAdminRegionOverlay[];
  frontlines: ConflictFrontlineOverlay[];
  updatedAt: string;
  mode: "public-approximation";
};
