import type { CrisisEvent, InfrastructureAsset } from "@/types/events";

export const mockEvents: CrisisEvent[] = [
  {
    id: "evt-001",
    title: "Regionaler Stromausfall gemeldet",
    description:
      "Mehrere Stadtteile melden unterbrochene Stromversorgung. Öffentliche Einrichtungen arbeiten teilweise mit Notstrom.",
    category: "power",
    severity: 4,
    confidence: 0.82,
    latitude: 50.1109,
    longitude: 8.6821,
    locationName: "Frankfurt am Main, Deutschland",
    eventTime: "2026-05-11T14:30:00.000Z",
    detectedTime: "2026-05-11T14:48:00.000Z",
    civilImpact:
      "Erhöhte Belastung für Verkehrssignale, Pflegeeinrichtungen und private Haushalte. Priorität liegt auf öffentlichen Notfallinformationen und Versorgung vulnerabler Gruppen.",
    sources: [
      {
        name: "Kommunales Lagezentrum",
        type: "public-agency",
        note: "Mock-Meldung eines kommunalen Lageberichts."
      },
      {
        name: "Bürgerhinweise",
        type: "local-report",
        note: "Mehrere konsistente Meldungen aus betroffenen Stadtteilen."
      }
    ]
  },
  {
    id: "evt-002",
    title: "Krankenhaus meldet Kapazitätsengpass",
    description:
      "Ein großes Krankenhaus meldet erhöhtes Patientenaufkommen und eingeschränkte Aufnahmekapazität in der Notaufnahme.",
    category: "hospital",
    severity: 3,
    confidence: 0.76,
    latitude: 40.7128,
    longitude: -74.006,
    locationName: "New York City, USA",
    eventTime: "2026-05-10T22:10:00.000Z",
    detectedTime: "2026-05-10T22:25:00.000Z",
    civilImpact:
      "Mögliche Verzögerungen bei ambulanter Versorgung. Umlenkung nicht kritischer Fälle und transparente Patienteninformation können Druck reduzieren.",
    sources: [
      {
        name: "Hospital Operations Mock Feed",
        type: "sensor-mock",
        note: "Simulierter Statusbericht für MVP-Demonstration."
      }
    ]
  },
  {
    id: "evt-003",
    title: "Brückenprüfung nach Starkregen",
    description:
      "Nach intensiven Regenfällen wurde eine wichtige Pendlerbrücke vorsorglich für technische Prüfungen eingeschränkt.",
    category: "bridge",
    severity: 2,
    confidence: 0.68,
    latitude: 35.6762,
    longitude: 139.6503,
    locationName: "Tokio, Japan",
    eventTime: "2026-05-09T08:20:00.000Z",
    detectedTime: "2026-05-09T08:55:00.000Z",
    civilImpact:
      "Pendlerverkehr und Lieferketten können sich verlangsamen. Umleitungsinformationen und ÖPNV-Kapazitäten sind für die Bevölkerung entscheidend.",
    sources: [
      {
        name: "Transport Authority Mock",
        type: "public-agency",
        note: "Simulierte Verkehrsmeldung."
      },
      {
        name: "Lokale Medien",
        type: "media",
        note: "Bericht über temporäre Fahrspursperrungen."
      }
    ]
  },
  {
    id: "evt-004",
    title: "Wasserversorgung unter Druck",
    description:
      "Mehrere Messpunkte zeigen niedrigen Versorgungsdruck. Betreiber prüfen Pumpstationen und Leitungsabschnitte.",
    category: "water",
    severity: 4,
    confidence: 0.71,
    latitude: -33.8688,
    longitude: 151.2093,
    locationName: "Sydney, Australien",
    eventTime: "2026-05-11T02:05:00.000Z",
    detectedTime: "2026-05-11T02:18:00.000Z",
    civilImpact:
      "Haushalte, Kliniken und kleine Betriebe können betroffen sein. Öffentliche Wasserabgabestellen und klare Qualitätshinweise wären zivile Prioritäten.",
    sources: [
      {
        name: "Water Utility Mock Telemetry",
        type: "sensor-mock",
        note: "Simulierte Druckwerte aus mehreren Zonen."
      }
    ]
  },
  {
    id: "evt-005",
    title: "Kommunikationsausfall in Küstenregion",
    description:
      "Mobilfunk- und Festnetzstörungen erschweren Informationsweitergabe nach einem Unwetter.",
    category: "communication",
    severity: 3,
    confidence: 0.64,
    latitude: -22.9068,
    longitude: -43.1729,
    locationName: "Rio de Janeiro, Brasilien",
    eventTime: "2026-05-08T18:40:00.000Z",
    detectedTime: "2026-05-08T19:05:00.000Z",
    civilImpact:
      "Betroffene Menschen können Warnungen und Hilfsangebote schlechter erreichen. Mehrkanal-Kommunikation über Radio, Aushänge und lokale Koordination wird wichtiger.",
    sources: [
      {
        name: "Community Reports",
        type: "local-report",
        note: "Gebündelte, simulierte Bürgerhinweise."
      },
      {
        name: "NGO Field Note",
        type: "ngo",
        note: "Mock-Beobachtung zur Erreichbarkeit."
      }
    ]
  },
  {
    id: "evt-006",
    title: "Unbestätigter Industriebrand",
    description:
      "Rauchentwicklung nahe eines Gewerbegebiets wurde gemeldet. Status ist noch unbestätigt und wird als niedriges Vertrauen geführt.",
    category: "unverified",
    severity: 2,
    confidence: 0.38,
    latitude: 31.2304,
    longitude: 121.4737,
    locationName: "Shanghai, China",
    eventTime: "2026-05-11T06:12:00.000Z",
    detectedTime: "2026-05-11T06:20:00.000Z",
    civilImpact:
      "Bis zur Verifikation sollten öffentliche Hinweise vorsichtig formuliert werden. Mögliche Relevanz für Luftqualität und Pendelverkehr.",
    sources: [
      {
        name: "Open Social Mock",
        type: "media",
        note: "Nicht verifizierte simulierte Meldung, bewusst mit niedriger Confidence."
      }
    ]
  },
  {
    id: "evt-007",
    title: "Schienenverkehr wegen Signalstörung eingeschränkt",
    description:
      "Eine Signalstörung führt zu Ausfällen und längeren Takten auf mehreren Pendlerlinien.",
    category: "rail",
    severity: 3,
    confidence: 0.88,
    latitude: 51.5072,
    longitude: -0.1276,
    locationName: "London, Vereinigtes Königreich",
    eventTime: "2026-05-11T07:45:00.000Z",
    detectedTime: "2026-05-11T07:49:00.000Z",
    civilImpact:
      "Pendler, Schichtdienste und Schulwege sind betroffen. Ersatzverbindungen und barrierefreie Alternativen sollten hervorgehoben werden.",
    sources: [
      {
        name: "Transit Ops Mock",
        type: "public-agency",
        note: "Simulierte Meldung eines Verkehrsbetriebs."
      }
    ]
  },
  {
    id: "evt-008",
    title: "Störung an Öl- und Treibstoffterminal",
    description:
      "Ein Terminal meldet technische Einschränkungen bei der Abfertigung. Keine Hinweise auf Gefahrstoffe außerhalb des Geländes.",
    category: "oil",
    severity: 3,
    confidence: 0.73,
    latitude: 25.2048,
    longitude: 55.2708,
    locationName: "Dubai, Vereinigte Arabische Emirate",
    eventTime: "2026-05-10T11:10:00.000Z",
    detectedTime: "2026-05-10T11:42:00.000Z",
    civilImpact:
      "Kurzfristige Lieferverzögerungen für zivile Logistik sind möglich. Relevanz liegt auf Versorgungskontinuität, Arbeitsschutz und öffentlicher Transparenz.",
    sources: [
      {
        name: "Port Infrastructure Mock",
        type: "sensor-mock",
        note: "Simulierter Betriebsstatus."
      }
    ]
  },
  {
    id: "evt-009",
    title: "Lokaler Brand mit Rauchbelastung",
    description:
      "Feuerwehr meldet einen Gebäudebrand mit temporärer Rauchbelastung in angrenzenden Wohngebieten.",
    category: "incident",
    severity: 2,
    confidence: 0.91,
    latitude: 48.8566,
    longitude: 2.3522,
    locationName: "Paris, Frankreich",
    eventTime: "2026-05-11T12:15:00.000Z",
    detectedTime: "2026-05-11T12:22:00.000Z",
    civilImpact:
      "Anwohner sollten Fenster geschlossen halten und lokale Hinweise beachten. Schwerpunkt ist Schutz vor Rauch und sichere Verkehrslenkung.",
    sources: [
      {
        name: "Fire Service Mock Bulletin",
        type: "public-agency",
        note: "Simulierte zivile Einsatzinformation ohne operative Details."
      }
    ]
  }
];

export const mockInfrastructure: InfrastructureAsset[] = [
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
