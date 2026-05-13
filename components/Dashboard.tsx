"use client";

import { useMemo, useState } from "react";
import { EventDetailPanel } from "@/components/EventDetailPanel";
import { EventFeed } from "@/components/EventFeed";
import { FilterBar } from "@/components/FilterBar";
import { MapView } from "@/components/MapView";
import { localInfrastructure } from "@/data/localInfrastructure";
import { eventCategories, type CrisisEvent, type EventFilters } from "@/types/events";
import { filterEvents } from "@/lib/filters";

const productionEvents: CrisisEvent[] = [];

const initialFilters: EventFilters = {
  categories: [...eventCategories],
  minSeverity: 1,
  minConfidence: 0
};

export function Dashboard() {
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [selectedEventId, setSelectedEventId] = useState("");

  const filteredEvents = useMemo(
    () => filterEvents(productionEvents, filters),
    [filters]
  );

  const selectedEvent = useMemo<CrisisEvent | undefined>(() => {
    return (
      filteredEvents.find((event) => event.id === selectedEventId) ??
      filteredEvents[0]
    );
  }, [filteredEvents, selectedEventId]);

  function handleSelectEvent(event: CrisisEvent) {
    setSelectedEventId(event.id);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0d1117] text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              HellFire
            </p>
            <h1 className="text-xl font-semibold text-white md:text-2xl">
              Civil Situation Monitor
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm text-slate-300 sm:flex">
            <StatusMetric label="Events" value={filteredEvents.length.toString()} />
            <StatusMetric
              label="Max Severity"
              value={(Math.max(...filteredEvents.map((event) => event.severity), 0)).toString()}
            />
            <StatusMetric label="Mode" value="Production" />
          </div>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)_420px]">
        <aside className="min-h-[42vh] border-b border-slate-800 bg-slate-950 xl:min-h-0 xl:border-b-0 xl:border-r">
          <FilterBar filters={filters} onChange={setFilters} />
          <EventFeed
            events={filteredEvents}
            selectedEventId={selectedEvent?.id}
            onSelectEvent={handleSelectEvent}
          />
        </aside>

        <section className="min-h-[58vh] xl:min-h-0">
          <MapView
            events={filteredEvents}
            selectedEvent={selectedEvent}
            infrastructure={localInfrastructure}
            onSelectEvent={handleSelectEvent}
          />
        </section>

        <aside className="border-t border-slate-800 bg-slate-950 xl:border-l xl:border-t-0">
          <EventDetailPanel
            event={selectedEvent}
            infrastructure={localInfrastructure}
          />
        </aside>
      </section>
    </main>
  );
}

function StatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}
