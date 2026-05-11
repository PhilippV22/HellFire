"use client";

import { useMemo, useState } from "react";
import { EarthGlobe } from "@/components/EarthGlobe";
import { mockEvents, mockInfrastructure } from "@/data/mockEvents";
import { mockTerrainFeatures } from "@/data/mockTerrain";
import { categoryMeta, infrastructureLabels } from "@/lib/eventMeta";
import { filterEvents, formatConfidence, formatDateTime } from "@/lib/filters";
import { getNearbyInfrastructure } from "@/lib/infrastructure";
import {
  eventCategories,
  type CrisisEvent,
  type EventCategory,
  type EventFilters,
  type InfrastructureAsset
} from "@/types/events";

const initialFilters: EventFilters = {
  categories: [...eventCategories],
  minSeverity: 1,
  minConfidence: 0
};

export function EarthSituationMonitor() {
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [selectedEventId, setSelectedEventId] = useState(mockEvents[0]?.id ?? "");

  const filteredEvents = useMemo(
    () => filterEvents(mockEvents, filters),
    [filters]
  );

  const selectedEvent = useMemo(() => {
    return (
      filteredEvents.find((event) => event.id === selectedEventId) ??
      filteredEvents[0] ??
      mockEvents[0]
    );
  }, [filteredEvents, selectedEventId]);

  function selectEvent(event: CrisisEvent) {
    setSelectedEventId(event.id);
  }

  function updateCategory(category: EventCategory) {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];

    setFilters({
      ...filters,
      categories: categories.length > 0 ? categories : [category]
    });
  }

  return (
    <main className="relative h-dvh min-h-[680px] overflow-hidden bg-black text-slate-100">
      <EarthGlobe
        events={filteredEvents}
        terrainFeatures={mockTerrainFeatures}
        selectedEvent={selectedEvent}
        onSelectEvent={selectEvent}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="pointer-events-auto flex w-fit max-w-full items-center gap-3 rounded-md border border-white/10 bg-slate-950/80 px-3 py-2 shadow-2xl backdrop-blur-md">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              HellFire
            </p>
            <h1 className="text-sm font-semibold text-white sm:text-base">
              Civil Earth Monitor
            </h1>
          </div>
          <div className="h-9 w-px bg-white/10" />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Events" value={filteredEvents.length.toString()} />
            <Metric label="Mode" value="Mock" />
          </div>
        </div>
      </div>

      <aside className="pointer-events-auto absolute bottom-4 left-4 top-24 z-20 hidden w-[340px] flex-col rounded-md border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-md lg:flex">
        <EventFeed
          events={filteredEvents}
          selectedEventId={selectedEvent?.id}
          onSelectEvent={selectEvent}
        />
      </aside>

      <aside className="pointer-events-auto absolute bottom-4 right-4 top-4 z-20 hidden w-[390px] rounded-md border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-md xl:block">
        <EventIntel event={selectedEvent} infrastructure={mockInfrastructure} />
      </aside>

      <section className="pointer-events-auto absolute bottom-4 left-1/2 z-20 hidden w-[560px] max-w-[calc(100vw-780px)] -translate-x-1/2 rounded-md border border-white/10 bg-slate-950/80 p-3 shadow-2xl backdrop-blur-md xl:block">
        <TerrainLegend />
        <EarthFilters
          filters={filters}
          onCategoryChange={updateCategory}
          onFiltersChange={setFilters}
        />
      </section>

      <section className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 max-h-[46vh] overflow-y-auto rounded-md border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md xl:hidden">
        <TerrainLegend />
        <EarthFilters
          filters={filters}
          onCategoryChange={updateCategory}
          onFiltersChange={setFilters}
        />
        <div className="mt-3 border-t border-white/10 pt-3">
          <MobileEventStrip
            events={filteredEvents}
            selectedEventId={selectedEvent?.id}
            onSelectEvent={selectEvent}
          />
        </div>
        <div className="mt-3 border-t border-white/10 pt-3">
          <EventIntel event={selectedEvent} infrastructure={mockInfrastructure} compact />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-16 rounded-md bg-white/5 px-2 py-1">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <span className="block text-xs font-semibold text-white">{value}</span>
    </div>
  );
}

function TerrainLegend() {
  const items = [
    { label: "Wald", className: "bg-emerald-400/70" },
    { label: "Fluss", className: "bg-sky-300" },
    { label: "Berg", className: "bg-amber-200" },
    { label: "Klippe", className: "bg-orange-300" }
  ];

  return (
    <div className="mb-3 grid grid-cols-4 gap-1.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-h-8 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 text-[11px] text-slate-300"
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.className}`} />
          <span className="truncate">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function EventFeed({
  events,
  selectedEventId,
  onSelectEvent
}: {
  events: CrisisEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: CrisisEvent) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
          Lagepunkte
        </h2>
        <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300">
          {events.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {events.map((event) => (
            <EventButton
              key={event.id}
              event={event}
              selected={event.id === selectedEventId}
              onSelectEvent={onSelectEvent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileEventStrip({
  events,
  selectedEventId,
  onSelectEvent
}: {
  events: CrisisEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: CrisisEvent) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          className={`flex min-w-[220px] items-center gap-2 rounded-md border px-3 py-2 text-left ${
            event.id === selectedEventId
              ? "border-cyan-300 bg-cyan-300/10"
              : "border-white/10 bg-white/5"
          }`}
          onClick={() => onSelectEvent(event)}
        >
          <span className="text-lg">{categoryMeta[event.category].icon}</span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-white">
              {event.title}
            </span>
            <span className="block truncate text-[11px] text-slate-400">
              {event.locationName}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function EventButton({
  event,
  selected,
  onSelectEvent
}: {
  event: CrisisEvent;
  selected: boolean;
  onSelectEvent: (event: CrisisEvent) => void;
}) {
  const meta = categoryMeta[event.category];

  return (
    <button
      type="button"
      className={`w-full rounded-md border p-3 text-left transition ${
        selected
          ? "border-cyan-300 bg-cyan-300/10"
          : "border-white/10 bg-white/5 hover:border-white/25"
      }`}
      onClick={() => onSelectEvent(event)}
    >
      <span className="flex items-start gap-3">
        <span
          className="mt-0.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-white/10"
          style={{ backgroundColor: meta.markerColor }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">
            {event.title}
          </span>
          <span className="mt-1 block truncate text-xs text-slate-400">
            {event.locationName}
          </span>
          <span className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
            <span>Severity {event.severity}</span>
            <span>{formatConfidence(event.confidence)}</span>
            <span className="truncate">{categoryMeta[event.category].label}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

function EarthFilters({
  filters,
  onCategoryChange,
  onFiltersChange
}: {
  filters: EventFilters;
  onCategoryChange: (category: EventCategory) => void;
  onFiltersChange: (filters: EventFilters) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-9 gap-1.5">
        {eventCategories.map((category) => {
          const meta = categoryMeta[category];
          const active = filters.categories.includes(category);

          return (
            <button
              key={category}
              type="button"
              title={meta.label}
              aria-pressed={active}
              className={`grid aspect-square min-h-8 place-items-center rounded-md border text-sm transition ${
                active
                  ? "border-cyan-300 bg-cyan-300/15"
                  : "border-white/10 bg-white/5 opacity-55 hover:opacity-100"
              }`}
              onClick={() => onCategoryChange(category)}
            >
              <span aria-hidden>{meta.icon}</span>
              <span className="sr-only">{meta.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-300">
          <span className="flex items-center justify-between">
            Mindestschwere
            <strong className="text-white">{filters.minSeverity}</strong>
          </span>
          <input
            className="mt-2 w-full accent-cyan-300"
            min={1}
            max={5}
            step={1}
            type="range"
            value={filters.minSeverity}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                minSeverity: Number(event.target.value)
              })
            }
          />
        </label>
        <label className="text-xs text-slate-300">
          <span className="flex items-center justify-between">
            Confidence
            <strong className="text-white">
              {Math.round(filters.minConfidence * 100)}%
            </strong>
          </span>
          <input
            className="mt-2 w-full accent-cyan-300"
            min={0}
            max={1}
            step={0.05}
            type="range"
            value={filters.minConfidence}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                minConfidence: Number(event.target.value)
              })
            }
          />
        </label>
      </div>
    </div>
  );
}

function EventIntel({
  event,
  infrastructure,
  compact = false
}: {
  event?: CrisisEvent;
  infrastructure: InfrastructureAsset[];
  compact?: boolean;
}) {
  if (!event) {
    return <p className="text-sm text-slate-400">Keine passenden Events.</p>;
  }

  const meta = categoryMeta[event.category];
  const nearbyInfrastructure = getNearbyInfrastructure(event, infrastructure, 25);

  return (
    <div className={compact ? "" : "h-full overflow-y-auto p-4"}>
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ring-white/10"
          style={{ backgroundColor: meta.markerColor }}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
            {meta.label}
          </p>
          <h2 className="mt-1 text-base font-semibold text-white">{event.title}</h2>
          <p className="mt-1 text-xs text-slate-400">{event.locationName}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Severity" value={`${event.severity}/5`} />
        <Metric label="Conf." value={formatConfidence(event.confidence)} />
        <Metric label="Sources" value={event.sources.length.toString()} />
      </div>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Zeit
        </h3>
        <p className="mt-1 text-sm text-slate-300">
          {formatDateTime(event.eventTime)}
        </p>
      </section>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Beschreibung
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{event.description}</p>
      </section>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Zivile Auswirkung
        </h3>
        <p className="mt-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">
          {event.civilImpact}
        </p>
      </section>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Infrastruktur im Radius
        </h3>
        <div className="mt-2 space-y-2">
          {nearbyInfrastructure.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-400">
              Keine Mock-Infrastruktur im 25-km-Radius.
            </p>
          ) : (
            nearbyInfrastructure.slice(0, compact ? 2 : 4).map((asset) => (
              <div
                key={asset.id}
                className="rounded-md border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {asset.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {infrastructureLabels[asset.type]}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-cyan-200">
                    {asset.distanceKm.toFixed(1)} km
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
