export const eventCategories = [
  "power",
  "oil",
  "hospital",
  "bridge",
  "rail",
  "water",
  "communication",
  "incident",
  "unverified"
] as const;

export type EventCategory = (typeof eventCategories)[number];

export type CrisisSource = {
  name: string;
  type: "public-agency" | "local-report" | "media" | "sensor-mock" | "ngo";
  url?: string;
  note: string;
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
  eventTime: string;
  detectedTime: string;
  sources: CrisisSource[];
  civilImpact: string;
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
};

export type EventFilters = {
  categories: EventCategory[];
  minSeverity: number;
  minConfidence: number;
};
