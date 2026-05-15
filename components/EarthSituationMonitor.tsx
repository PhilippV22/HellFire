"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EarthGlobe } from "@/components/EarthGlobe";
import { hellfireBrandAssets } from "@/lib/brandAssets";
import { categoryMeta, infrastructureLabels } from "@/lib/eventMeta";
import { filterEvents, formatConfidence, formatDateTime } from "@/lib/filters";
import { getNearbyInfrastructure } from "@/lib/infrastructure";
import type { ConflictOverlayData } from "@/types/conflictOverlay";
import {
  eventCategories,
  type CrisisEvent,
  type EventCategory,
  type EventDetail,
  type EventFilters,
  type InfrastructureAsset,
  type TimelineBucket
} from "@/types/events";

type ApiListResponse<T> = {
  data: T;
  source?: "production" | "production-live";
  warning?: string;
};

const initialFilters: EventFilters = {
  categories: [...eventCategories],
  minSeverity: 1,
  minConfidence: 0
};

export function EarthSituationMonitor() {
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [infrastructure, setInfrastructure] =
    useState<InfrastructureAsset[]>([]);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [conflictOverlay, setConflictOverlay] =
    useState<ConflictOverlayData | null>(null);
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<EventDetail | null>(null);
  const [dataMode, setDataMode] = useState<"production">("production");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [
        eventResponse,
        infrastructureResponse,
        timelineResponse,
        conflictOverlayResponse
      ] =
        await Promise.all([
          fetch("/api/events", { cache: "no-store" }),
          fetch("/api/infrastructure", { cache: "no-store" }),
          fetch("/api/timeline", { cache: "no-store" }),
          fetch("/api/conflict-overlays", { cache: "no-store" })
        ]);
      const eventPayload =
        (await eventResponse.json()) as ApiListResponse<CrisisEvent[]>;
      const infrastructurePayload =
        (await infrastructureResponse.json()) as ApiListResponse<InfrastructureAsset[]>;
      const timelinePayload =
        (await timelineResponse.json()) as ApiListResponse<TimelineBucket[]>;
      const conflictOverlayPayload =
        (await conflictOverlayResponse.json()) as ApiListResponse<ConflictOverlayData>;

      setEvents(eventPayload.data ?? []);
      setInfrastructure(infrastructurePayload.data ?? []);
      setTimeline(timelinePayload.data ?? []);
      setConflictOverlay(conflictOverlayPayload.data ?? null);
      setDataMode("production");
      setWarning(
        eventPayload.warning ||
          infrastructurePayload.warning ||
          timelinePayload.warning ||
          conflictOverlayPayload.warning ||
          ""
      );
    } catch (error) {
      setEvents([]);
      setInfrastructure([]);
      setTimeline([]);
      setConflictOverlay(null);
      setDataMode("production");
      setWarning(error instanceof Error ? error.message : "API nicht erreichbar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadDashboard(), 0);

    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);

  const filteredEvents = useMemo(
    () => filterEvents(events, filters),
    [events, filters]
  );

  const selectedEvent = useMemo(() => {
    return (
      filteredEvents.find((event) => event.id === selectedEventId) ??
      filteredEvents[0] ??
      events[0]
    );
  }, [events, filteredEvents, selectedEventId]);

  useEffect(() => {
    if (!selectedEvent) {
      const timeout = window.setTimeout(() => setSelectedDetail(null), 0);

      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;
    const selectedEventIdForDetail = selectedEvent.id;

    async function loadDetail() {
      try {
        const response = await fetch(`/api/events/${selectedEventIdForDetail}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as ApiListResponse<EventDetail>;

        if (!cancelled) {
          setSelectedDetail(payload.data ?? null);
        }
      } catch {
        if (!cancelled) {
          setSelectedDetail(null);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

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

  async function runIngestRefresh() {
    setRefreshing(true);

    try {
      await Promise.all([
        fetch("/api/ingest/gdelt", { method: "POST" }),
        fetch("/api/ingest/gdelt-doc", { method: "POST" }),
        fetch("/api/ingest/reliefweb", { method: "POST" }),
        fetch("/api/ingest/usgs", { method: "POST" }),
        fetch("/api/ingest/emsc", { method: "POST" }),
        fetch("/api/ingest/gdacs", { method: "POST" }),
        fetch("/api/ingest/eonet", { method: "POST" }),
        fetch("/api/ingest/conflict-news", { method: "POST" }),
        fetch("/api/ingest/rss", { method: "POST" })
      ]);
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }

  const regionOptions = useMemo(() => {
    const regions = new Set<string>();

    for (const event of events) {
      const region = event.region || event.country || event.locationName;

      if (region) {
        regions.add(region);
      }
    }

    return Array.from(regions).sort((a, b) => a.localeCompare(b));
  }, [events]);

  return (
    <main className="relative h-dvh min-h-[720px] overflow-hidden bg-black text-slate-100">
      <EarthGlobe
        events={filteredEvents}
        conflictOverlay={conflictOverlay}
        selectedEvent={selectedEvent}
        onSelectEvent={selectEvent}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="pointer-events-auto flex w-fit max-w-full items-center gap-3 rounded-md border border-white/10 bg-slate-950/82 px-3 py-2 shadow-2xl backdrop-blur-md">
          <Image
            src={hellfireBrandAssets.logos.horizontalLockupDark}
            alt="HellFire"
            width={470}
            height={123}
            priority
            className="h-12 w-auto max-w-[220px] object-contain"
          />
          <div className="hidden h-9 w-px bg-white/10 sm:block" />
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Metric label="Events" value={filteredEvents.length.toString()} />
            <Metric
              label="Konflikt"
              value={(conflictOverlay?.countries.length ?? 0).toString()}
            />
            <Metric label="Mode" value={loading ? "Load" : dataMode.toUpperCase()} />
          </div>
          <button
            type="button"
            className="hidden rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200 sm:block"
            onClick={() => void runIngestRefresh()}
            disabled={refreshing}
          >
            {refreshing ? "Sync..." : "Sync"}
          </button>
        </div>
        {warning ? (
          <p className="pointer-events-auto mt-2 w-fit rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
            {warning}
          </p>
        ) : null}
      </div>

      <aside className="pointer-events-auto absolute bottom-4 left-4 top-24 z-20 hidden w-[350px] flex-col rounded-md border border-white/10 bg-slate-950/82 shadow-2xl backdrop-blur-md lg:flex">
        <EventFeed
          events={filteredEvents}
          selectedEventId={selectedEvent?.id}
          onSelectEvent={selectEvent}
        />
      </aside>

      <aside className="pointer-events-auto absolute bottom-4 right-4 top-4 z-20 hidden w-[410px] rounded-md border border-white/10 bg-slate-950/82 shadow-2xl backdrop-blur-md xl:block">
        <EventIntel
          event={selectedDetail ?? selectedEvent}
          infrastructure={infrastructure}
        />
      </aside>

      <section className="pointer-events-auto absolute bottom-4 left-1/2 z-20 hidden w-[620px] max-w-[calc(100vw-820px)] -translate-x-1/2 rounded-md border border-white/10 bg-slate-950/82 p-3 shadow-2xl backdrop-blur-md xl:block">
        <TimelinePanel timeline={timeline} />
        <EarthFilters
          filters={filters}
          regionOptions={regionOptions}
          onCategoryChange={updateCategory}
          onFiltersChange={setFilters}
        />
      </section>

      <section className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 max-h-[52vh] overflow-y-auto rounded-md border border-white/10 bg-slate-950/94 p-3 shadow-2xl backdrop-blur-md xl:hidden">
        <EarthFilters
          filters={filters}
          regionOptions={regionOptions}
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
          <EventIntel
            event={selectedDetail ?? selectedEvent}
            infrastructure={infrastructure}
            compact
          />
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
          Event Feed
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
          className={`flex min-w-[230px] items-center gap-2 rounded-md border px-3 py-2 text-left ${
            event.id === selectedEventId
              ? "border-cyan-300 bg-cyan-300/10"
              : "border-white/10 bg-white/5"
          }`}
          onClick={() => onSelectEvent(event)}
        >
          <CategoryVisual category={event.category} className="h-7 w-7" />
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
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10 bg-black/35">
          <CategoryVisual category={event.category} className="h-7 w-7" />
        </span>
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
            <span className="truncate">{meta.label}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

function EarthFilters({
  filters,
  regionOptions,
  onCategoryChange,
  onFiltersChange
}: {
  filters: EventFilters;
  regionOptions: string[];
  onCategoryChange: (category: EventCategory) => void;
  onFiltersChange: (filters: EventFilters) => void;
}) {
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="grid grid-cols-7 gap-1.5">
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
              <CategoryVisual category={category} className="h-6 w-6" />
              <span className="sr-only">{meta.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
        <label className="text-xs text-slate-300">
          <span>Region</span>
          <select
            className="mt-2 h-8 w-full rounded-md border border-white/10 bg-slate-950 px-2 text-xs text-white"
            value={filters.region ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                region: event.target.value || undefined
              })
            }
          >
            <option value="">Alle Regionen</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function TimelinePanel({ timeline }: { timeline: TimelineBucket[] }) {
  const visible = timeline.slice(0, 8);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
          Timeline
        </h2>
        <span className="text-[11px] text-slate-500">nach Tag und Kategorie</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {visible.length === 0 ? (
          <p className="col-span-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
            Noch keine Timeline-Daten.
          </p>
        ) : (
          visible.map((bucket) => {
            const meta = categoryMeta[bucket.category];

            return (
              <div
                key={`${bucket.day}:${bucket.category}:${bucket.country}:${bucket.region}`}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">{bucket.day}</span>
                  <span className="text-xs" style={{ color: meta.markerColor }}>
                    {bucket.count}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-white">
                  {meta.label} S{bucket.maxSeverity}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function EventIntel({
  event,
  infrastructure,
  compact = false
}: {
  event?: CrisisEvent | EventDetail | null;
  infrastructure: InfrastructureAsset[];
  compact?: boolean;
}) {
  if (!event) {
    return <p className="text-sm text-slate-400">Keine passenden Events.</p>;
  }

  const meta = categoryMeta[event.category];
  const detail = isEventDetail(event) ? event : null;
  const nearbyInfrastructure =
    detail?.nearbyInfrastructure ??
    getNearbyInfrastructure(event, infrastructure, 50).slice(0, compact ? 2 : 5);
  const rawReports = detail?.rawReports ?? [];
  const notes = detail?.analysisNotes ?? [];

  return (
    <div className={compact ? "" : "h-full overflow-y-auto p-4"}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-black/35">
          <CategoryVisual category={event.category} className="h-8 w-8" />
        </span>
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
        <Metric
          label="Sources"
          value={(event.sourceCount ?? event.sources.length).toString()}
        />
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
          Quellen
        </h3>
        <div className="mt-2 space-y-2">
          {event.sources.slice(0, compact ? 2 : 5).map((source) => (
            <div
              key={`${source.name}:${source.reportId ?? source.url ?? source.note}`}
              className="rounded-md border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-white">{source.name}</p>
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                  {source.type}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">{source.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Radius-Infrastruktur
        </h3>
        <div className="mt-2 space-y-2">
          {nearbyInfrastructure.length === 0 ? (
            <p className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-400">
              Keine Infrastruktur im 50-km-Radius.
            </p>
          ) : (
            nearbyInfrastructure.slice(0, compact ? 2 : 5).map((asset) => (
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
                  {"distanceKm" in asset ? (
                    <span className="shrink-0 text-xs text-cyan-200">
                      {asset.distanceKm.toFixed(1)} km
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {!compact && rawReports.length > 0 ? (
        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Rohberichte
          </h3>
          <div className="mt-2 space-y-2">
            {rawReports.slice(0, 4).map((report) => (
              <div
                key={report.id}
                className="rounded-md border border-white/10 bg-white/5 p-3"
              >
                <p className="text-sm font-medium text-white">{report.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {report.sourceName} · {formatConfidence(report.confidence)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!compact && notes.length > 0 ? (
        <section className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Analyse-Notizen
          </h3>
          <div className="mt-2 space-y-2">
            {notes.slice(0, 3).map((note) => (
              <p
                key={note.id}
                className="rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300"
              >
                {note.body}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function isEventDetail(event: CrisisEvent | EventDetail): event is EventDetail {
  return "rawReports" in event;
}

function CategoryVisual({
  category,
  className
}: {
  category: EventCategory;
  className?: string;
}) {
  const meta = categoryMeta[category];

  if (meta.assetPath) {
    return (
      <Image
        src={meta.assetPath}
        alt=""
        width={64}
        height={64}
        className={`object-contain ${className ?? "h-6 w-6"}`}
      />
    );
  }

  return (
    <span className={className ?? "text-sm"} aria-hidden>
      {meta.icon}
    </span>
  );
}
