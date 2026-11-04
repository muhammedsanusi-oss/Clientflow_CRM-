"use client";
import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { addBusinessAction, type BusinessActionState } from "./actions";
import { CredentialReceipt } from "./credential-receipt";
import { WEBSITE_TEMPLATES, WEBSITE_TEMPLATE_KEYS, sampleBusinessDetails, type WebsiteTemplateKey } from "../../../../../packages/domain/src/website-templates";
import { BusinessWebsite } from "../../../components/business-sites/business-website";

const fields = [
  { name: "name", label: "Business name", type: "text", autoComplete: "organization", maxLength: 100 },
  { name: "first_name", label: "Owner first name", type: "text", autoComplete: "given-name", maxLength: 50 },
  { name: "last_name", label: "Owner last name", type: "text", autoComplete: "family-name", maxLength: 50 },
  { name: "owner_email", label: "Owner login email (private)", type: "email", autoComplete: "email", maxLength: 254 },
  { name: "email", label: "Business contact email (shown on website)", type: "email", autoComplete: "email", maxLength: 254 },
  { name: "phone_number", label: "Business phone number (shown on website)", type: "tel", autoComplete: "tel", maxLength: 15 },
] as const;
const swatches = { BAKERY: "bg-[#f1e6d2] text-[#88451e]", BARBERSHOP: "bg-[#151c1b] text-[#d3ad73]", SALON: "bg-[#f0e4dc] text-[#85594d]", CONTACT: "bg-[#e9eddf] text-[#3e5945]" };

export function WebsiteBusinessForm() {
  const [state, action, pending] = useActionState(addBusinessAction, {} as BusinessActionState);
  const [draft, setDraft] = useState<Record<string, string>>({ name: "", first_name: "", last_name: "", owner_email: "", email: "", phone_number: "", description: "", business_type: "OTHER", website_template: "CONTACT", public_address: "", opening_hours: "" });
  const preview = useRef<HTMLDialogElement>(null);
  const selected = draft.website_template as WebsiteTemplateKey;
  const sample = WEBSITE_TEMPLATES[selected];
  const update = (key: string, value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  if (state.receipt) return <CredentialReceipt receipt={state.receipt} />;
  return <>
    <form action={action} noValidate aria-busy={pending} className="space-y-7">
      {state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.error.message}</p>}
      <fieldset className="space-y-4"><legend className="text-lg font-semibold text-[#172b4d]">Choose a website template</legend>
        <p className="text-sm text-slate-500">One standard design, personalized with this business&apos;s information.</p>
        <input type="hidden" name="website_template" value={selected} />
        <div className="grid grid-cols-2 gap-3">{WEBSITE_TEMPLATE_KEYS.map(key => <button type="button" key={key} aria-pressed={selected === key} onClick={() => setDraft(previous => ({ ...previous, website_template: key, business_type: WEBSITE_TEMPLATES[key].businessType }))}
          className={`overflow-hidden rounded-xl border text-left transition focus:outline-none focus:ring-4 focus:ring-indigo-200 ${selected === key ? "border-indigo-600 ring-2 ring-indigo-600" : "border-slate-200 hover:border-indigo-300"}`}>
          <span className={`flex h-24 items-center justify-center font-serif text-3xl ${swatches[key]}`}>{key === "BAKERY" ? "Freshly baked." : key === "BARBERSHOP" ? "Stay sharp." : key === "SALON" ? "In full bloom." : "Let’s talk."}</span>
          <span className="block px-4 py-3"><span className="block text-sm font-semibold">{WEBSITE_TEMPLATES[key].label}{selected === key ? " ✓" : ""}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{WEBSITE_TEMPLATES[key].features.join(" · ")}</span></span>
        </button>)}</div>
        {state.fieldErrors?.website_template?.[0] && <p role="alert" className="text-sm text-red-700">{state.fieldErrors.website_template[0]}</p>}
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => preview.current?.showModal()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-indigo-700">Preview template ↗</button>
          <button type="button" onClick={() => setDraft(sampleBusinessDetails(selected, crypto.randomUUID().slice(0,12)))} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">Use sample details</button></div>
        <p className="text-xs text-slate-500">Sample details include a fresh test owner email. Nothing is saved until you create the business.</p>
      </fieldset>
      <div className="border-t border-slate-200 pt-5"><h2 className="text-lg font-semibold text-[#172b4d]">Business & owner details</h2><p className="mt-1 text-sm text-slate-500">The owner email is for signing in. Business contact details appear on the website.</p></div>
      {fields.map(field => { const error = state.fieldErrors?.[field.name]?.[0]; return <div key={field.name}>
        <label htmlFor={field.name} className="mb-1 block text-sm font-medium">{field.label}</label>
        <input id={field.name} name={field.name} type={field.type} autoComplete={field.autoComplete} maxLength={field.maxLength} required value={draft[field.name]} onChange={event => update(field.name,event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.name}-error` : undefined} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />
        {error && <p id={`${field.name}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
      </div>; })}
      <div><label htmlFor="description" className="mb-1 block text-sm font-medium">What does the business do?</label><textarea id="description" name="description" required maxLength={1000} value={draft.description} onChange={event => update("description",event.target.value)} aria-invalid={Boolean(state.fieldErrors?.description)} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />{state.fieldErrors?.description?.[0] && <p role="alert" className="text-sm text-red-700">{state.fieldErrors.description[0]}</p>}</div>
      <div><label htmlFor="business_type" className="mb-1 block text-sm font-medium">Business type</label><select id="business_type" name="business_type" value={draft.business_type} onChange={event => update("business_type",event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600"><option value="BAKERY">Bakery</option><option value="BARBERSHOP">Barbershop</option><option value="SALON">Salon</option><option value="SPA">Spa</option><option value="CLINIC">Clinic</option><option value="OTHER">Other</option></select>{state.fieldErrors?.business_type?.[0] && <p role="alert" className="text-sm text-red-700">{state.fieldErrors.business_type[0]}</p>}</div>
      {[{ name: "public_address", label: "Public address (optional)", max: 300 }, { name: "opening_hours", label: "Opening hours (optional)", max: 500 }].map(field => <div key={field.name}><label htmlFor={field.name} className="mb-1 block text-sm font-medium">{field.label}</label><input id={field.name} name={field.name} maxLength={field.max} value={draft[field.name]} onChange={event => update(field.name,event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />{state.fieldErrors?.[field.name as "public_address" | "opening_hours"]?.[0] && <p role="alert" className="text-sm text-red-700">{state.fieldErrors[field.name as "public_address" | "opening_hours"]?.[0]}</p>}</div>)}
      <div className="flex items-center gap-4"><button disabled={pending} className="rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white disabled:opacity-50"><span aria-live="polite">{pending ? "Creating business & website..." : "Create business & website"}</span></button><Link href="/" className="text-sm text-slate-600 underline">Cancel</Link></div>
    </form>
    <dialog ref={preview} className="m-auto max-h-[92vh] w-[96vw] max-w-6xl overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-950/60"><div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-3 text-sm"><strong>{sample.label} preview</strong><button type="button" onClick={() => preview.current?.close()} className="rounded-lg border border-slate-300 px-3 py-1.5">Close preview</button></div>
      <BusinessWebsite preview site={{ name: draft.name || sample.name, description: draft.description || sample.description, websiteTemplate: selected, email: draft.email || sample.email, phone_number: draft.phone_number || sample.phone, publicAddress: draft.public_address, openingHours: draft.opening_hours }} />
    </dialog>
  </>;
}
