"use client";

import { categoryMeta, infrastructureLabels } from "@/lib/eventMeta";
import { formatConfidence, formatDateTime } from "@/lib/filters";
import { getNearbyInfrastructure } from "@/lib/infrastructure";
import type { CrisisEvent, InfrastructureAsset } from "@/types/events";

type EventDetailPanelProps = {
  event?: CrisisEvent;
  infrastructure: InfrastructureAsset[];
};

export function EventDetailPanel({
  event,
  infrastructure
}: EventDetailPanelProps) {
  if (!event) {
    return (
      <div className="p-5 text-sm text-slate-400">
        Kein Event ausgewählt.
      </div>
    );
  }

  const meta = categoryMeta[event.category];
  const nearbyInfrastructure = getNearbyInfrastructure(event, infrastructure, 25);

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-md text-2xl ${meta.color}`}
        >
          {meta.icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            {meta.label}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{event.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{event.locationName}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <DetailMetric label="Schwere" value={`${event.severity}/5`} />
        <DetailMetric label="Confidence" value={formatConfidence(event.confidence)} />
        <DetailMetric label="Quellen" value={event.sources.length.toString()} />
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Beschreibung
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{event.description}</p>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Zivile Auswirkungsanalyse
        </h3>
        <p className="mt-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">
          {event.civilImpact}
        </p>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Zeiten
        </h3>
        <div className="mt-2 space-y-2 text-sm text-slate-300">
          <TimeRow label="Eventzeit" value={formatDateTime(event.eventTime)} />
          <TimeRow label="Erkannt" value={formatDateTime(event.detectedTime)} />
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Quellen
        </h3>
        <div className="mt-2 space-y-2">
          {event.sources.map((source) => (
            <div
              key={`${event.id}-${source.name}`}
              className="rounded-md border border-slate-800 bg-slate-900 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{source.name}</p>
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  {source.type}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{source.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Radiusanalyse 25 km
        </h3>
        <div className="mt-2 space-y-2">
          {nearbyInfrastructure.length === 0 ? (
            <div className="rounded-md border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">
              Keine Mock-Infrastruktur im Radius.
            </div>
          ) : (
            nearbyInfrastructure.map((asset) => (
              <div
                key={asset.id}
                className="rounded-md border border-slate-800 bg-slate-900 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{asset.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {infrastructureLabels[asset.type]} · {asset.serviceRole}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200">
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

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function TimeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-900 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-100">{value}</span>
    </div>
  );
}
