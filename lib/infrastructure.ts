import type { CrisisEvent, InfrastructureAsset } from "@/types/events";

export type NearbyInfrastructure = InfrastructureAsset & {
  distanceKm: number;
};

const earthRadiusKm = 6371;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceKm(
  first: Pick<CrisisEvent, "latitude" | "longitude">,
  second: Pick<InfrastructureAsset, "latitude" | "longitude">
): number {
  const dLat = toRadians(second.latitude - first.latitude);
  const dLon = toRadians(second.longitude - first.longitude);
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function getNearbyInfrastructure(
  event: CrisisEvent,
  infrastructure: InfrastructureAsset[],
  radiusKm = 25
): NearbyInfrastructure[] {
  return infrastructure
    .map((asset) => ({
      ...asset,
      distanceKm: distanceKm(event, asset)
    }))
    .filter((asset) => asset.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
