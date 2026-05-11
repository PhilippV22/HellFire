import type { EventCategory, InfrastructureType } from "@/types/events";

export const categoryMeta: Record<
  EventCategory,
  { label: string; icon: string; color: string; markerColor: string }
> = {
  power: {
    label: "Power",
    icon: "⚡",
    color: "bg-yellow-300 text-slate-950",
    markerColor: "#facc15"
  },
  oil: {
    label: "Oil",
    icon: "🛢️",
    color: "bg-stone-300 text-slate-950",
    markerColor: "#d6d3d1"
  },
  hospital: {
    label: "Hospital",
    icon: "🏥",
    color: "bg-rose-300 text-slate-950",
    markerColor: "#fda4af"
  },
  bridge: {
    label: "Bridge",
    icon: "🌉",
    color: "bg-sky-300 text-slate-950",
    markerColor: "#7dd3fc"
  },
  rail: {
    label: "Rail",
    icon: "🚉",
    color: "bg-emerald-300 text-slate-950",
    markerColor: "#6ee7b7"
  },
  water: {
    label: "Water",
    icon: "🚰",
    color: "bg-cyan-300 text-slate-950",
    markerColor: "#67e8f9"
  },
  communication: {
    label: "Communication",
    icon: "📡",
    color: "bg-violet-300 text-slate-950",
    markerColor: "#c4b5fd"
  },
  incident: {
    label: "Incident",
    icon: "🔥",
    color: "bg-orange-300 text-slate-950",
    markerColor: "#fdba74"
  },
  unverified: {
    label: "Unverified",
    icon: "⚠️",
    color: "bg-slate-300 text-slate-950",
    markerColor: "#cbd5e1"
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
