import { infrastructureLabels } from "@/lib/eventMeta";
import type {
  CrisisEvent,
  EventCategory,
  InfrastructureAsset
} from "@/types/events";

const categoryImpacts: Record<EventCategory, string> = {
  power:
    "Stromversorgung, Verkehrssignale, Pflegeeinrichtungen und private Haushalte koennen beeintraechtigt sein.",
  oil:
    "Zivile Logistik, Treibstoffversorgung und Arbeitsschutzprozesse sollten beobachtet werden.",
  hospital:
    "Versorgungskapazitaeten koennen sich verschieben; Umlenkung nicht kritischer Faelle kann relevant werden.",
  bridge:
    "Pendlerverkehr, Rettungswege und Lieferketten koennen durch Umleitungen belastet werden.",
  rail:
    "Pendler, Schulwege und Schichtdienste koennen durch Ausfaelle oder laengere Takte betroffen sein.",
  water:
    "Trinkwasser, Sanitaerbetrieb, Kliniken und kleine Betriebe koennen unter Versorgungsdruck geraten.",
  communication:
    "Warnungen, Notrufe und Hilfsangebote erreichen die Bevoelkerung moeglicherweise schlechter.",
  earthquake:
    "Nachbeben, Gebaeudeschäden, Versorgungsausfaelle und Bedarf an oeffentlicher Lageinformation sind moeglich.",
  disaster:
    "Unterkunft, Trinkwasser, medizinische Basisversorgung und Verkehrswege koennen zusaetzlich belastet sein.",
  protest:
    "Oeffentlicher Verkehr, Innenstadtzugang und kommunale Dienste koennen zeitweise beeintraechtigt sein.",
  conflict:
    "Zivile Sicherheit, Grundversorgung und Bewegungsfreiheit der Bevoelkerung koennen beeintraechtigt sein.",
  health:
    "Vulnerable Gruppen, Kliniken und oeffentliche Gesundheitskommunikation stehen im Vordergrund.",
  incident:
    "Lokale Schutz- und Verkehrshinweise sowie transparente Entwarnung sind fuer Anwohner wichtig.",
  unverified:
    "Die Meldung sollte vorsichtig behandelt und klar als unbestaetigt gekennzeichnet werden."
};

export function createCivilImpactAnalysis(
  input: Pick<CrisisEvent, "category" | "severity" | "locationName">,
  nearbyInfrastructure: InfrastructureAsset[] = []
) {
  const base = categoryImpacts[input.category];
  const severityPhrase =
    input.severity >= 4
      ? "Hohe Prioritaet fuer zivile Lagekommunikation und Basisversorgung."
      : input.severity >= 3
        ? "Mittlere Prioritaet; Lageentwicklung und Servicekontinuitaet beobachten."
        : "Niedrige bis moderate Prioritaet; Verifikation und lokale Hinweise reichen meist aus.";
  const nearbyPhrase =
    nearbyInfrastructure.length > 0
      ? `Nahe Infrastruktur: ${nearbyInfrastructure
          .slice(0, 4)
          .map((asset) => `${asset.name} (${infrastructureLabels[asset.type]})`)
          .join(", ")}.`
      : "Keine kritische Infrastruktur im lokalen Radius gefunden.";

  return `${base} ${severityPhrase} ${nearbyPhrase}`;
}
