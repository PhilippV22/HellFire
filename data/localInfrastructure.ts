import type { InfrastructureAsset } from "@/types/events";

export const localInfrastructure: InfrastructureAsset[] = [
  {
    id: "infra-001",
    name: "Innenstadt-Klinikum",
    type: "hospital",
    latitude: 50.1181,
    longitude: 8.6872,
    serviceRole: "Akutversorgung und Notaufnahme"
  },
  {
    id: "infra-002",
    name: "Main Umspannwerk Ost",
    type: "power-substation",
    latitude: 50.1218,
    longitude: 8.719,
    serviceRole: "Stromverteilung für öffentliche Infrastruktur"
  },
  {
    id: "infra-003",
    name: "Lower Manhattan Clinic",
    type: "hospital",
    latitude: 40.716,
    longitude: -74.012,
    serviceRole: "Ambulante Versorgung"
  },
  {
    id: "infra-004",
    name: "Harbor Fuel Terminal",
    type: "fuel-terminal",
    latitude: 25.216,
    longitude: 55.281,
    serviceRole: "Zivile Treibstofflogistik"
  },
  {
    id: "infra-005",
    name: "Central Rail Interchange",
    type: "rail-station",
    latitude: 51.503,
    longitude: -0.112,
    serviceRole: "Pendlerknoten und Ersatzverkehr"
  },
  {
    id: "infra-006",
    name: "East Water Treatment",
    type: "water-treatment",
    latitude: -33.872,
    longitude: 151.235,
    serviceRole: "Trinkwasseraufbereitung"
  },
  {
    id: "infra-007",
    name: "Koto Commuter Bridge",
    type: "bridge",
    latitude: 35.684,
    longitude: 139.692,
    serviceRole: "Pendler- und Rettungsroute"
  },
  {
    id: "infra-008",
    name: "Coastal Communications Hub",
    type: "communications-hub",
    latitude: -22.914,
    longitude: -43.183,
    serviceRole: "Regionale Warn- und Mobilfunkdienste"
  },
  {
    id: "infra-009",
    name: "Paris Community Hospital",
    type: "hospital",
    latitude: 48.849,
    longitude: 2.34,
    serviceRole: "Notfall- und Atemwegsversorgung"
  },
  {
    id: "infra-010",
    name: "Shanghai Water Pump Station",
    type: "water-treatment",
    latitude: 31.219,
    longitude: 121.492,
    serviceRole: "Kommunale Wasserversorgung"
  }
];
