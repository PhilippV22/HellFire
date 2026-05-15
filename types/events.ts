export const eventCategories = [
  "power",
  "oil",
  "hospital",
  "bridge",
  "rail",
  "water",
  "communication",
  "earthquake",
  "disaster",
  "protest",
  "conflict",
  "health",
  "incident",
  "unverified"
] as const;

export type EventCategory = (typeof eventCategories)[number];

export type EventStatus = "unreviewed" | "confirmed" | "rejected";

export type SourceType =
  | "public-agency"
  | "local-report"
  | "media"
  | "sensor-mock"
  | "ngo"
  | "gdelt"
  | "gdelt-doc"
  | "reliefweb"
  | "usgs"
  | "gdacs"
  | "eonet"
  | "emsc"
  | "conflict-news"
  | "rss"
  | "admin";

export type CrisisSource = {
  name: string;
  type: SourceType;
  url?: string;
  note: string;
  reportId?: string;
};

export type CrisisEvent = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  latitude: number;
  longitude: number;
  locationName: string;
  country?: string;
  region?: string;
  placeName?: string;
  eventTime: string;
  detectedTime: string;
  sources: CrisisSource[];
  civilImpact: string;
  status?: EventStatus;
  sourceCount?: number;
  rawReportCount?: number;
  geocodeConfidence?: number;
  updatedAt?: string;
};

export type InfrastructureType =
  | "hospital"
  | "power-substation"
  | "water-treatment"
  | "rail-station"
  | "bridge"
  | "communications-hub"
  | "fuel-terminal";

export type InfrastructureAsset = {
  id: string;
  name: string;
  type: InfrastructureType;
  latitude: number;
  longitude: number;
  serviceRole: string;
  country?: string;
  region?: string;
};

export type EventFilters = {
  categories: EventCategory[];
  minSeverity: number;
  minConfidence: number;
  region?: string;
  country?: string;
};

export type RawReport = {
  id: string;
  sourceId: string;
  sourceName: string;
  externalId: string;
  title: string;
  description: string;
  url?: string;
  country?: string;
  region?: string;
  placeName?: string;
  latitude?: number;
  longitude?: number;
  category: EventCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  geocodeConfidence: number;
  eventTime: string;
  detectedTime: string;
  eventId?: string;
  rawPayload?: unknown;
  processedAt?: string;
  createdAt?: string;
};

export type AnalysisNote = {
  id: string;
  eventId: string;
  noteType: "impact" | "admin" | "system";
  body: string;
  createdBy: string;
  createdAt: string;
};

export type TimelineBucket = {
  day: string;
  category: EventCategory;
  country?: string;
  region?: string;
  count: number;
  maxSeverity: number;
};

export type EventDetail = CrisisEvent & {
  rawReports: RawReport[];
  nearbyInfrastructure: (InfrastructureAsset & { distanceKm: number })[];
  analysisNotes: AnalysisNote[];
};
