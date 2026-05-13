import type { EventCategory, InfrastructureType } from "@/types/events";
import { hellfireBrandAssets } from "@/lib/brandAssets";

export const categoryMeta: Record<
  EventCategory,
  {
    label: string;
    icon: string;
    color: string;
    markerColor: string;
    assetPath?: string;
  }
> = {
  power: {
    label: "Power",
    icon: "⚡",
    color: "bg-yellow-300 text-slate-950",
    markerColor: "#facc15",
    assetPath: hellfireBrandAssets.categories.power
  },
  oil: {
    label: "Oil",
    icon: "🛢️",
    color: "bg-stone-300 text-slate-950",
    markerColor: "#d6d3d1",
    assetPath: hellfireBrandAssets.categories.oil
  },
  hospital: {
    label: "Hospital",
    icon: "🏥",
    color: "bg-rose-300 text-slate-950",
    markerColor: "#fda4af",
    assetPath: hellfireBrandAssets.categories.hospital
  },
  bridge: {
    label: "Bridge",
    icon: "🌉",
    color: "bg-sky-300 text-slate-950",
    markerColor: "#7dd3fc",
    assetPath: hellfireBrandAssets.categories.bridge
  },
  rail: {
    label: "Rail",
    icon: "🚉",
    color: "bg-emerald-300 text-slate-950",
    markerColor: "#6ee7b7",
    assetPath: hellfireBrandAssets.categories.rail
  },
  water: {
    label: "Water",
    icon: "🚰",
    color: "bg-cyan-300 text-slate-950",
    markerColor: "#67e8f9",
    assetPath: hellfireBrandAssets.categories.water
  },
  communication: {
    label: "Communication",
    icon: "📡",
    color: "bg-violet-300 text-slate-950",
    markerColor: "#c4b5fd",
    assetPath: hellfireBrandAssets.categories.communication
  },
  earthquake: {
    label: "Earthquake",
    icon: "◈",
    color: "bg-red-300 text-slate-950",
    markerColor: "#f87171"
  },
  disaster: {
    label: "Disaster",
    icon: "◆",
    color: "bg-teal-300 text-slate-950",
    markerColor: "#5eead4"
  },
  protest: {
    label: "Protest",
    icon: "●",
    color: "bg-fuchsia-300 text-slate-950",
    markerColor: "#f0abfc"
  },
  conflict: {
    label: "Conflict",
    icon: "◇",
    color: "bg-red-200 text-slate-950",
    markerColor: "#fecaca"
  },
  health: {
    label: "Health",
    icon: "✚",
    color: "bg-lime-300 text-slate-950",
    markerColor: "#bef264"
  },
  incident: {
    label: "Incident",
    icon: "🔥",
    color: "bg-orange-300 text-slate-950",
    markerColor: "#fdba74",
    assetPath: hellfireBrandAssets.categories.incident
  },
  unverified: {
    label: "Unverified",
    icon: "⚠️",
    color: "bg-slate-300 text-slate-950",
    markerColor: "#cbd5e1",
    assetPath: hellfireBrandAssets.categories.unverified
  }
};

export const infrastructureLabels: Record<InfrastructureType, string> = {
  hospital: "Krankenhaus",
  "power-substation": "Umspannwerk",
  "water-treatment": "Wasseranlage",
  "rail-station": "Bahnhof",
  bridge: "Brücke",
  "communications-hub": "Kommunikationsknoten",
  "fuel-terminal": "Treibstoffterminal"
};
