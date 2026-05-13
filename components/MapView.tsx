"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl, { type Map, type Marker } from "maplibre-gl";
import { categoryMeta } from "@/lib/eventMeta";
import type { CrisisEvent, InfrastructureAsset } from "@/types/events";

type MapViewProps = {
  events: CrisisEvent[];
  selectedEvent?: CrisisEvent;
  infrastructure: InfrastructureAsset[];
  onSelectEvent: (event: CrisisEvent) => void;
};

const worldCenter: [number, number] = [14, 28];

export function MapView({
  events,
  selectedEvent,
  infrastructure,
  onSelectEvent
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const infrastructureGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: infrastructure.map((asset) => ({
        type: "Feature" as const,
        properties: {
          id: asset.id,
          name: asset.name,
          type: asset.type
        },
        geometry: {
          type: "Point" as const,
          coordinates: [asset.longitude, asset.latitude]
        }
      }))
    }),
    [infrastructure]
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: worldCenter,
      zoom: 1.35,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      map.addSource("infrastructure", {
        type: "geojson",
        data: infrastructureGeoJson
      });

      map.addLayer({
        id: "infrastructure-points",
        type: "circle",
        source: "infrastructure",
        paint: {
          "circle-radius": 5,
          "circle-color": "#22d3ee",
          "circle-opacity": 0.8,
          "circle-stroke-color": "#0f172a",
          "circle-stroke-width": 2
        }
      });
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [infrastructureGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    events.forEach((event) => {
      const meta = categoryMeta[event.category];
      const element = document.createElement("button");
      element.type = "button";
      element.className = "event-marker";
      element.dataset.active = String(event.id === selectedEvent?.id);
      element.style.borderColor = meta.markerColor;
      element.textContent = meta.icon;
      element.title = `${event.title} · ${event.locationName}`;
      element.addEventListener("click", () => onSelectEvent(event));

      const popup = new maplibregl.Popup({ offset: 24 }).setHTML(
        `<strong>${escapeHtml(event.title)}</strong><br/><span>${escapeHtml(
          event.locationName
        )}</span>`
      );

      const marker = new maplibregl.Marker({ element })
        .setLngLat([event.longitude, event.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [events, onSelectEvent, selectedEvent?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedEvent) {
      return;
    }

    map.easeTo({
      center: [selectedEvent.longitude, selectedEvent.latitude],
      zoom: Math.max(map.getZoom(), 3),
      duration: 650
    });
  }, [selectedEvent]);

  return (
    <div className="relative h-full min-h-[58vh] bg-slate-900 xl:min-h-0">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 max-w-[calc(100%-2rem)] rounded-md border border-slate-800 bg-slate-950/90 p-3 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
          Weltkarte
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Produktionsdaten aus OSINT-Quellen und lokaler Datenbank
        </p>
      </div>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
