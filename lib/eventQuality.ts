import { isEventFresh } from "@/lib/eventLifecycle";
import type {
  CrisisEvent,
  EventQualityFlag,
  LocationPrecision,
  VerificationStatus
} from "@/types/events";

type QualityInput = Pick<
  CrisisEvent,
  | "category"
  | "severity"
  | "confidence"
  | "eventTime"
  | "detectedTime"
  | "locationName"
  | "placeName"
  | "country"
  | "geocodeConfidence"
  | "sourceCount"
  | "sources"
> & {
  qualityFlags?: EventQualityFlag[];
};

export function enrichEventQuality<T extends CrisisEvent>(event: T): T {
  const assessment = assessEventQuality(event);

  return {
    ...event,
    qualityFlags: assessment.qualityFlags,
    locationPrecision: assessment.locationPrecision,
    verificationStatus: assessment.verificationStatus
  };
}

export function assessEventQuality(event: QualityInput) {
  const flags = new Set<EventQualityFlag>(
    (event.qualityFlags ?? []).filter((flag) => flag === "conflicting-reports")
  );
  const geocodeConfidence = event.geocodeConfidence ?? 0.25;
  const sourceCount = event.sourceCount ?? event.sources?.length ?? 0;

  if (geocodeConfidence < 0.5) {
    flags.add("low-geocode");
  }

  if (geocodeConfidence < 0.65) {
    flags.add("approximate-location");
  }

  if (geocodeConfidence < 0.5 && isCountryCentroidLocation(event)) {
    flags.add("country-centroid");
  }

  if (isHeadlinePlaceFragment(event.locationName) || isHeadlinePlaceFragment(event.placeName)) {
    flags.add("headline-place-fragment");
  }

  if (sourceCount <= 1) {
    flags.add("single-source");
  }

  if (event.sources?.some((source) => !source.url)) {
    flags.add("missing-source-url");
  }

  if (!isEventFresh(event)) {
    flags.add("stale");
  }

  if (isLikelyNonEventText(`${event.locationName} ${event.placeName ?? ""}`)) {
    flags.add("possible-non-event");
  }

  const qualityFlags = Array.from(flags);

  return {
    qualityFlags,
    locationPrecision: getLocationPrecision(event, qualityFlags),
    verificationStatus: getVerificationStatus(event, qualityFlags)
  };
}

export function isLikelyNonEventText(text: string) {
  const normalized = text.toLowerCase();
  const hardNonEventTerms =
    /(whale|wildlife|rap sensation|hip-hop|film crew|cannes|container ships|shipyards|companies receive offer|human rights activist|dies by suicide|leaving a note|journalist|needs no advertising|no one else has analogues|defense companies|put pressure on eu|pipeline bypassing|by 2027|simplified issuance of passports|boost protection|strategic partnership|implicated in .*tapes|non-military targets|intelligence believes|could lead to|aimed at reshaping|security council meets|liberates two settlements|continue fighting for|withdraws forces|suicide drones can now skip|wants war to go on|threatened strike|pay price for|anti-war actress|letter of repentance|rejects .*mediation|peace talks|military infrastructure|assets .*rubles|изъяли активы|пригрозил ударом|отвергли план|what you need to know)/;
  const acuteTerms =
    /\b(killed|injured|dead|attack|strike|shelling|earthquake|flood|wildfire|fire|evacuat|collapsed|outbreak|explosion|missile|drone|tsunami|cyclone|hurricane)\b/;

  if (hardNonEventTerms.test(normalized)) {
    return true;
  }

  if (acuteTerms.test(normalized)) {
    return false;
  }

  return /\b(anniversary|remembered|commemorat|opinion|analysis|explainer|profile|tax overhaul|could be deceptive|minister(?:s)? meet|summit|talks? ongoing|advertising|wanted man|history of|what to know|can .* lead to|can be .*victory|may .* next|might .* next|could resume strikes|intelligence believes|casts itself .*peacemaker|thanks .* for help|rap sensation|hip-hop|film crew|cannes|whale|wildlife|container ships|shipyards|companies receive offer|speaks out|director|analyst|reacts to .*decree|citizenship|imports .*surge|sealed the fate|replaces governors|arrest warrant|fled country)\b/.test(
    normalized
  );
}

export function isHeadlinePlaceFragment(value?: string) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();

  return /\b(killed|injured|wants|war to go on|minister|companies|history|tribunal|preparation|lists ongoing|warns|could|may|might|tax|deceptive|advertising|announce|extension|attacks across)\b/.test(
    normalized
  );
}

function getLocationPrecision(
  event: QualityInput,
  flags: EventQualityFlag[]
): LocationPrecision {
  const geocodeConfidence = event.geocodeConfidence ?? 0.25;

  if (flags.includes("headline-place-fragment")) {
    return "unknown";
  }

  if (geocodeConfidence >= 0.9) {
    return "exact";
  }

  if (geocodeConfidence >= 0.65) {
    return "regional";
  }

  if (flags.includes("country-centroid")) {
    return "country";
  }

  if (geocodeConfidence >= 0.35) {
    return "approximate";
  }

  return "unknown";
}

function getVerificationStatus(
  event: QualityInput,
  flags: EventQualityFlag[]
): VerificationStatus {
  if (flags.includes("conflicting-reports")) {
    return "conflicted";
  }

  if ((event.confidence ?? 0) < 0.45 || flags.includes("low-geocode")) {
    return "low-confidence";
  }

  const sourceCount = event.sourceCount ?? event.sources?.length ?? 0;

  if (sourceCount >= 3 && (event.confidence ?? 0) >= 0.72) {
    return "verified";
  }

  if (sourceCount >= 2) {
    return "multi-source";
  }

  return "single-source";
}

function isCountryCentroidLocation(event: QualityInput) {
  return Boolean(
    event.country &&
      (!event.placeName ||
        event.placeName === event.country ||
        event.locationName === event.country ||
        event.locationName.endsWith(`, ${event.country}`))
  );
}
