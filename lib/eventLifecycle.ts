import type { EventCategory } from "@/types/events";

type EventLifecycleInput = {
  category: EventCategory;
  severity: number;
  eventTime?: string;
  detectedTime?: string;
};

const baseRetentionHours: Record<EventCategory, number> = {
  power: 48,
  oil: 48,
  hospital: 72,
  bridge: 96,
  rail: 48,
  water: 72,
  communication: 48,
  earthquake: 120,
  disaster: 168,
  protest: 48,
  conflict: 96,
  health: 336,
  incident: 48,
  unverified: 18
};

export function getEventRetentionHours(
  category: EventCategory,
  severity: number
) {
  const severityBonus = Math.max(0, Math.min(4, severity - 1)) * 12;

  return baseRetentionHours[category] + severityBonus;
}

export function isEventFresh(event: EventLifecycleInput, now = new Date()) {
  const anchor = getEventAnchorTime(event);

  if (!anchor) {
    return false;
  }

  const retentionMs =
    getEventRetentionHours(event.category, event.severity) * 60 * 60 * 1000;

  return now.getTime() - anchor.getTime() <= retentionMs;
}

function getEventAnchorTime(event: EventLifecycleInput) {
  const dates = [event.detectedTime, event.eventTime]
    .map((value) => (value ? new Date(value) : null))
    .filter((value): value is Date => Boolean(value && Number.isFinite(value.getTime())));

  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.max(...dates.map((date) => date.getTime())));
}
