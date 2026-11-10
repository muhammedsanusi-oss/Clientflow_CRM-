"use client";

import { WEBSITE_TEMPLATES, WEBSITE_TEMPLATE_KEYS, type WebsiteTemplateKey } from "../../../../packages/domain/src/website-templates";

const swatches: Record<WebsiteTemplateKey, string> = {
  BAKERY: "bg-[#f1e6d2] text-[#88451e]",
  BARBERSHOP: "bg-[#151c1b] text-[#d3ad73]",
  SALON: "bg-[#f0e4dc] text-[#85594d]",
  CONTACT: "bg-[#e9eddf] text-[#3e5945]",
};

const headlines: Record<WebsiteTemplateKey, string> = {
  BAKERY: "Freshly baked.",
  BARBERSHOP: "Stay sharp.",
  SALON: "In full bloom.",
  CONTACT: "Let's talk.",
};

export function WebsiteTemplatePicker({ value, onChange, error }: {
  value: WebsiteTemplateKey;
  onChange: (template: WebsiteTemplateKey) => void;
  error?: string;
}) {
  return <div>
    <div className="grid grid-cols-2 gap-3">
      {WEBSITE_TEMPLATE_KEYS.map(key => <button
        type="button"
        key={key}
        aria-pressed={value === key}
        onClick={() => onChange(key)}
        className={`overflow-hidden rounded-xl border text-left transition focus:outline-none focus:ring-4 focus:ring-indigo-200 ${value === key ? "border-indigo-600 ring-2 ring-indigo-600" : "border-slate-200 hover:border-indigo-300"}`}
      >
        <span className={`flex h-24 items-center justify-center font-serif text-3xl ${swatches[key]}`}>{headlines[key]}</span>
        <span className="block px-4 py-3">
          <span className="block text-sm font-semibold">{WEBSITE_TEMPLATES[key].label}{value === key ? " ✓" : ""}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{WEBSITE_TEMPLATES[key].features.join(" · ")}</span>
        </span>
      </button>)}
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
