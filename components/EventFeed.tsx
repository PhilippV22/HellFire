"use client";

import { categoryMeta } from "@/lib/eventMeta";
import { formatConfidence, formatDateTime } from "@/lib/filters";
import type { CrisisEvent } from "@/types/events";

type EventFeedProps = {
  events: CrisisEvent[];
  selectedEventId?: string;
  onSelectEvent: (event: CrisisEvent) => void;
};

export function EventFeed({
  events,
  selectedEventId,
  onSelectEvent
}: EventFeedProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Event Feed
        </h2>
        <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
          {events.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {events.length === 0 ? (
          <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            Keine Events passen zu den aktuellen Filtern.
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const meta = categoryMeta[event.category];
              const active = event.id === selectedEventId;

              return (
                <button
                  key={event.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-left transition ${
                    active
                      ? "border-cyan-300 bg-slate-800"
                      : "border-slate-800 bg-slate-900 hover:border-slate-600"
                  }`}
                  onClick={() => onSelectEvent(event)}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-lg ${meta.color}`}
                    >
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">
                        {event.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {event.locationName}
                      </span>
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                    <FeedMetric label="Schwere" value={event.severity.toString()} />
                    <FeedMetric
                      label="Confidence"
                      value={formatConfidence(event.confidence)}
                    />
                    <FeedMetric label="Zeit" value={formatDateTime(event.eventTime)} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 rounded-md bg-slate-950 px-2 py-1">
      <span className="block uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      <span className="mt-0.5 block truncate text-slate-200">{value}</span>
    </span>
  );
}
