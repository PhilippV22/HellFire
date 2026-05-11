import type { CrisisEvent, EventFilters } from "@/types/events";

export function filterEvents(
  events: CrisisEvent[],
  filters: EventFilters
): CrisisEvent[] {
  return events.filter((event) => {
    return (
      filters.categories.includes(event.category) &&
      event.severity >= filters.minSeverity &&
      event.confidence >= filters.minConfidence
    );
  });
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}
