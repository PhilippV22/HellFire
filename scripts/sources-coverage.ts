import {
  countryCoverage,
  enabledGlobalRssSources,
  summarizeSourceCoverage
} from "@/data/sourceCatalog";

const minimumSources = Number(process.env.HELLFIRE_SOURCE_MIN_FEEDS ?? 500);
const minimumCountries = Number(process.env.HELLFIRE_SOURCE_MIN_COUNTRIES ?? 200);
const minimumGermany = Number(process.env.HELLFIRE_SOURCE_MIN_GERMANY ?? 5);
const coverage = summarizeSourceCoverage();
const byCountry = new Map<string, number>();

for (const source of enabledGlobalRssSources) {
  if (source.countryCode === "GLOBAL") {
    continue;
  }

  byCountry.set(source.countryCode, (byCountry.get(source.countryCode) ?? 0) + 1);
}

process.stdout.write("HellFire Source Coverage\n");
process.stdout.write(`Enabled sources: ${coverage.enabledSources}\n`);
process.stdout.write(`Countries/territories: ${coverage.enabledCountries}\n`);
process.stdout.write(`Germany sources: ${coverage.germanySources}\n`);
process.stdout.write(`Conflict-tagged sources: ${coverage.conflictSources}\n`);
process.stdout.write("\nTop covered countries:\n");

for (const [countryCode, count] of Array.from(byCountry.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)) {
  const country = countryCoverage.find((entry) => entry.countryCode === countryCode);
  process.stdout.write(`- ${country?.country ?? countryCode}: ${count}\n`);
}

const errors: string[] = [];

if (coverage.enabledSources < minimumSources) {
  errors.push(`Expected at least ${minimumSources} enabled RSS/Atom sources.`);
}

if (coverage.enabledCountries < minimumCountries) {
  errors.push(`Expected at least ${minimumCountries} covered countries/territories.`);
}

if (coverage.germanySources < minimumGermany) {
  errors.push(`Expected at least ${minimumGermany} German sources.`);
}

if (errors.length > 0) {
  process.stderr.write(`\n${errors.join("\n")}\n`);
  process.exit(1);
}
