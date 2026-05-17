"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { hellfireBrandAssets } from "@/lib/brandAssets";
import { categoryMeta } from "@/lib/eventMeta";
import { formatConfidence, formatDateTime } from "@/lib/filters";
import {
  eventCategories,
  type CrisisEvent,
  type EventCategory,
  type EventStatus,
  type RawReport
} from "@/types/events";

type ApiResponse<T> = {
  data?: T;
  error?: string;
  detail?: string;
  warning?: string;
};

type SourceHealthResponse = {
  coverage: {
    enabledSources: number;
    enabledCountries: number;
    germanySources: number;
    conflictSources: number;
  };
  sources: SourceHealthItem[];
};

type SourceHealthItem = {
  id: string;
  name: string;
  url?: string;
  country?: string;
  language?: string;
  tags?: string[];
  enabled: boolean;
  failureCount: number;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  disabledReason?: string;
};

export function AdminDashboard() {
  const [events, setEvents] = useState<CrisisEvent[]>([]);
  const [rawReports, setRawReports] = useState<RawReport[]>([]);
  const [sourceHealth, setSourceHealth] = useState<SourceHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [eventsResponse, rawResponse] = await Promise.all([
        fetch("/api/events?includeRejected=1", { cache: "no-store" }),
        fetch("/api/admin/raw-reports", { cache: "no-store" })
      ]);
      const sourceResponse = await fetch("/api/admin/source-health", {
        cache: "no-store"
      });
      const eventsPayload = (await eventsResponse.json()) as ApiResponse<CrisisEvent[]>;
      const rawPayload = (await rawResponse.json()) as ApiResponse<RawReport[]>;
      const sourcePayload =
        (await sourceResponse.json()) as ApiResponse<SourceHealthResponse>;

      setEvents(eventsPayload.data ?? []);
      setRawReports(rawPayload.data ?? []);
      setSourceHealth(sourcePayload.data ?? null);
      setMessage(
        rawPayload.error ||
          eventsPayload.error ||
          sourcePayload.error ||
          sourcePayload.warning ||
          ""
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Admin API nicht erreichbar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  async function handleUpdate(
    eventId: string,
    input: { status?: EventStatus; confidence?: number; category?: EventCategory }
  ) {
    const response = await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as ApiResponse<CrisisEvent>;

    if (!response.ok || !payload.data) {
      setMessage(payload.detail || payload.error || "Update fehlgeschlagen");
      return;
    }

    setEvents((current) =>
      current.map((event) => (event.id === eventId ? payload.data! : event))
    );
    setMessage("Event aktualisiert.");
  }

  return (
    <main className="min-h-dvh bg-[#050913] text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="min-h-[calc(100dvh-40px)] rounded-md border border-white/10 bg-slate-950/80 shadow-2xl">
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              Lokale Admin-Oberflaeche
            </p>
            <Image
              src={hellfireBrandAssets.logos.horizontalLockupDark}
              alt="HellFire"
              width={470}
              height={123}
              priority
              className="mt-2 h-14 w-auto max-w-[260px] object-contain"
            />
            <p className="mt-2 text-sm text-slate-400">
              Rohberichte, Event-Status und Confidence werden lokal verwaltet.
            </p>
          </div>

          {message ? (
            <p className="mx-4 mt-4 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              {message}
            </p>
          ) : null}

          <div className="space-y-3 p-4">
            {loading ? (
              <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                Lade lokale Daten...
              </p>
            ) : events.length === 0 ? (
              <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                Keine Events gefunden. Starte zuerst Seed oder Ingestion.
              </p>
            ) : (
              events.map((event) => (
                <AdminEventCard
                  key={`${event.id}:${event.status}:${event.category}:${event.confidence}:${event.updatedAt}`}
                  event={event}
                  onUpdate={(input) => void handleUpdate(event.id, input)}
                />
              ))
            )}
          </div>
        </section>

        <aside className="min-h-[calc(100dvh-40px)] rounded-md border border-white/10 bg-slate-950/80 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Quellen & Raw Reports
            </h2>
            <span className="rounded bg-white/5 px-2 py-1 text-xs text-slate-300">
              {rawReports.length}
            </span>
          </div>
          <div className="max-h-[calc(100dvh-104px)] space-y-3 overflow-y-auto p-4">
            {sourceHealth ? <SourceHealthPanel health={sourceHealth} /> : null}
            {rawReports.map((report) => (
              <RawReportCard key={report.id} report={report} />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

function SourceHealthPanel({ health }: { health: SourceHealthResponse }) {
  const failingSources = health.sources
    .filter((source) => source.failureCount > 0 || source.lastError)
    .slice(0, 8);

  return (
    <section className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
        Source Health
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MiniMetric label="Quellen" value={`${health.coverage.enabledSources}`} />
        <MiniMetric label="Laender" value={`${health.coverage.enabledCountries}`} />
        <MiniMetric label="Deutschland" value={`${health.coverage.germanySources}`} />
        <MiniMetric label="Konflikt" value={`${health.coverage.conflictSources}`} />
      </div>
      {failingSources.length > 0 ? (
        <div className="mt-3 space-y-2">
          {failingSources.map((source) => (
            <div
              key={source.id}
              className="rounded-md border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-white">{source.name}</span>
                <span className="shrink-0 text-amber-200">
                  {source.failureCount} fail
                </span>
              </div>
              <p className="mt-1 truncate text-slate-400">
                {[source.country, source.language, source.lastError]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-cyan-50/80">
          Keine lokalen Feed-Fehler gespeichert.
        </p>
      )}
    </section>
  );
}

function AdminEventCard({
  event,
  onUpdate
}: {
  event: CrisisEvent;
  onUpdate: (input: {
    status?: EventStatus;
    confidence?: number;
    category?: EventCategory;
  }) => void;
}) {
  const [status, setStatus] = useState<EventStatus>(event.status ?? "unreviewed");
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [confidence, setConfidence] = useState(event.confidence);
  const meta = categoryMeta[event.category];

  return (
    <article className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CategoryVisual category={event.category} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              {meta.label} · {event.status ?? "unreviewed"}
            </p>
          </div>
          <h3 className="mt-2 text-base font-semibold text-white">{event.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{event.locationName}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <MiniMetric label="Severity" value={`${event.severity}/5`} />
          <MiniMetric label="Conf." value={formatConfidence(event.confidence)} />
          <MiniMetric label="Sources" value={`${event.sourceCount ?? event.sources.length}`} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
        <label className="text-xs text-slate-300">
          Status
          <select
            className="mt-1 h-9 w-full rounded-md border border-white/10 bg-slate-950 px-2 text-white"
            value={status}
            onChange={(input) => setStatus(input.target.value as EventStatus)}
          >
            <option value="unreviewed">unreviewed</option>
            <option value="confirmed">confirmed</option>
            <option value="rejected">rejected</option>
            <option value="archived">archived</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Kategorie
          <select
            className="mt-1 h-9 w-full rounded-md border border-white/10 bg-slate-950 px-2 text-white"
            value={category}
            onChange={(input) => setCategory(input.target.value as EventCategory)}
          >
            {eventCategories.map((item) => (
              <option key={item} value={item}>
                {categoryMeta[item].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Confidence {Math.round(confidence * 100)}%
          <input
            className="mt-3 w-full accent-cyan-300"
            min={0}
            max={1}
            step={0.01}
            type="range"
            value={confidence}
            onChange={(input) => setConfidence(Number(input.target.value))}
          />
        </label>
        <button
          type="button"
          className="self-end rounded-md border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200"
          onClick={() => onUpdate({ status, category, confidence })}
        >
          Speichern
        </button>
      </div>
    </article>
  );
}

function CategoryVisual({ category }: { category: EventCategory }) {
  const meta = categoryMeta[category];

  if (meta.assetPath) {
    return (
      <Image
        src={meta.assetPath}
        alt=""
        width={48}
        height={48}
        className="h-7 w-7 object-contain"
      />
    );
  }

  return <span aria-hidden>{meta.icon}</span>;
}

function RawReportCard({ report }: { report: RawReport }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white">{report.title}</p>
        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
          {report.sourceId}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
        {report.description}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
        <span>{categoryMeta[report.category].label}</span>
        <span>{formatConfidence(report.confidence)}</span>
        <span>{formatDateTime(report.detectedTime)}</span>
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-white/5 px-2 py-1">
      <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <span className="block font-semibold text-white">{value}</span>
    </span>
  );
}
