"use client";

import { categoryMeta } from "@/lib/eventMeta";
import { eventCategories, type EventCategory, type EventFilters } from "@/types/events";

type FilterBarProps = {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
};

export function FilterBar({ filters, onChange }: FilterBarProps) {
  function toggleCategory(category: EventCategory) {
    const categories = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];

    onChange({
      ...filters,
      categories: categories.length > 0 ? categories : [category]
    });
  }

  return (
    <div className="border-b border-slate-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
          Filter
        </h2>
        <button
          type="button"
          className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-cyan-300 hover:text-cyan-200"
          onClick={() =>
            onChange({
              categories: [...eventCategories],
              minSeverity: 1,
              minConfidence: 0
            })
          }
        >
          Reset
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {eventCategories.map((category) => {
          const meta = categoryMeta[category];
          const active = filters.categories.includes(category);

          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              className={`flex min-h-11 items-center justify-center rounded-md border text-lg transition ${
                active
                  ? "border-cyan-300 bg-slate-800"
                  : "border-slate-800 bg-slate-900 opacity-55 hover:opacity-90"
              }`}
              title={meta.label}
              onClick={() => toggleCategory(category)}
            >
              <span aria-hidden>{meta.icon}</span>
              <span className="sr-only">{meta.label}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-5 block text-sm text-slate-300">
        <span className="flex items-center justify-between">
          Mindestschwere
          <strong className="text-white">{filters.minSeverity}</strong>
        </span>
        <input
          className="mt-2 w-full accent-cyan-300"
          min={1}
          max={5}
          step={1}
          type="range"
          value={filters.minSeverity}
          onChange={(event) =>
            onChange({ ...filters, minSeverity: Number(event.target.value) })
          }
        />
      </label>

      <label className="mt-4 block text-sm text-slate-300">
        <span className="flex items-center justify-between">
          Confidence
          <strong className="text-white">
            {Math.round(filters.minConfidence * 100)}%
          </strong>
        </span>
        <input
          className="mt-2 w-full accent-cyan-300"
          min={0}
          max={1}
          step={0.05}
          type="range"
          value={filters.minConfidence}
          onChange={(event) =>
            onChange({ ...filters, minConfidence: Number(event.target.value) })
          }
        />
      </label>
    </div>
  );
}
