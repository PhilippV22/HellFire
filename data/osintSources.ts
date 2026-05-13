export type SourceConfig = {
  id:
    | "gdelt"
    | "gdelt-doc"
    | "reliefweb"
    | "usgs"
    | "gdacs"
    | "eonet"
    | "emsc"
    | "rss";
  name: string;
  sourceType:
    | "gdelt"
    | "gdelt-doc"
    | "reliefweb"
    | "usgs"
    | "gdacs"
    | "eonet"
    | "emsc"
    | "rss";
  baseUrl: string;
  cadenceMinutes?: number;
};

export const osintSources: SourceConfig[] = [
  {
    id: "gdelt",
    name: "GDELT Cloud v2",
    sourceType: "gdelt",
    baseUrl: "https://api.gdeltcloud.com/api/v2",
    cadenceMinutes: 15
  },
  {
    id: "gdelt-doc",
    name: "GDELT Project Doc 2.1",
    sourceType: "gdelt-doc",
    baseUrl: "https://api.gdeltproject.org/api/v2/doc/doc",
    cadenceMinutes: 15
  },
  {
    id: "reliefweb",
    name: "ReliefWeb",
    sourceType: "reliefweb",
    baseUrl: "https://api.reliefweb.int/v1",
    cadenceMinutes: 30
  },
  {
    id: "usgs",
    name: "USGS Earthquake Hazards Program",
    sourceType: "usgs",
    baseUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0",
    cadenceMinutes: 10
  },
  {
    id: "gdacs",
    name: "GDACS Disaster Alerts",
    sourceType: "gdacs",
    baseUrl: "https://www.gdacs.org/xml/rss.xml",
    cadenceMinutes: 15
  },
  {
    id: "eonet",
    name: "NASA EONET",
    sourceType: "eonet",
    baseUrl: "https://eonet.gsfc.nasa.gov/api/v3/events",
    cadenceMinutes: 30
  },
  {
    id: "emsc",
    name: "EMSC SeismicPortal",
    sourceType: "emsc",
    baseUrl: "https://www.seismicportal.eu/fdsnws/event/1/query",
    cadenceMinutes: 10
  },
  {
    id: "rss",
    name: "Public Crisis RSS Feeds",
    sourceType: "rss",
    baseUrl: "local://public-crisis-rss",
    cadenceMinutes: 30
  }
];
