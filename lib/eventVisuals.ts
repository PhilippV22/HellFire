import { categoryMeta } from "@/lib/eventMeta";
import type { CrisisEvent } from "@/types/events";

export type EventSubtype =
  | "wildfire"
  | "flood"
  | "tsunami"
  | "storm"
  | "earthquake"
  | "generic-disaster"
  | "other";

export type EventVisualMeta = (typeof categoryMeta)[keyof typeof categoryMeta];

export function getEventSubtype(event: CrisisEvent): EventSubtype {
  const text = getSearchText(event);

  if (
    event.category === "earthquake" ||
    /\b(earthquake|aftershock|seismic|magnitude|erdbeben)\b/i.test(text)
  ) {
    return "earthquake";
  }

  if (
    /\b(wildfire|forest fire|bushfire|brush fire|grass fire|waldbrand|vegetation fire)\b/i.test(
      text
    )
  ) {
    return "wildfire";
  }

  if (/\b(tsunami|tidal wave|storm surge|sturmflut)\b/i.test(text)) {
    return "tsunami";
  }

  if (
    /\b(flood|flooding|flash flood|inundation|river overflow|hochwasser|ueberschwemm|flut)\b/i.test(
      text
    )
  ) {
    return "flood";
  }

  if (
    /\b(storm|cyclone|hurricane|typhoon|tornado|monsoon|windstorm|orkan|sturm)\b/i.test(
      text
    )
  ) {
    return "storm";
  }

  if (event.category === "disaster") {
    return "generic-disaster";
  }

  return "other";
}

export function getEventVisual(event: CrisisEvent): EventVisualMeta {
  const meta = categoryMeta[event.category];
  const subtype = getEventSubtype(event);

  if (subtype === "wildfire") {
    return {
      ...meta,
      icon: "🔥",
      markerColor: "#fb923c",
      assetPath: categoryMeta.incident.assetPath
    };
  }

  if (subtype === "flood" || subtype === "tsunami") {
    return {
      ...meta,
      icon: "≈",
      markerColor: "#38bdf8",
      assetPath: categoryMeta.water.assetPath
    };
  }

  if (subtype === "storm") {
    return {
      ...meta,
      icon: "◌",
      markerColor: "#a78bfa",
      assetPath: categoryMeta.disaster.assetPath
    };
  }

  if (subtype === "earthquake") {
    return {
      ...meta,
      icon: "◈",
      markerColor: "#f87171",
      assetPath: categoryMeta.earthquake.assetPath
    };
  }

  return meta;
}

function getSearchText(event: CrisisEvent) {
  return `${event.title} ${event.description} ${event.locationName} ${event.category}`;
}
