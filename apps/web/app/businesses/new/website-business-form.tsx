/*
 * Code guide: apps/web/app/businesses/new/website-business-form.tsx
 * Choose Bakery, Barbershop, Salon, or Contact, fill sample details, preview unsaved content, and create a
 * business plus owner account through addBusinessAction. Previewing alone creates no records.
 * Runs as an interactive client component; protected writes are delegated to server endpoints/actions.
 */
"use client";
/*
 * Import connection: react.
 * React provides browser component rendering and state/form hooks; database access remains in server/domain
 * functions.
 * useActionState: Connects a form to a Server Action and exposes its returned errors/receipt plus pending
 * status.
 * useRef: Keeps a stable reference to the template-preview dialog so buttons can open or close it.
 * useState: Keeps temporary component state in the browser, such as draft fields, pending status, and
 * messages.
 */
import { useActionState, useRef, useState } from "react";
/*
 * Import connection: next/link.
 * Next.js Link renders application navigation links; it does not itself authorize a destination or write
 * data.
 * Link: Client-side application navigation component; the destination still performs its own access checks.
 */
import Link from "next/link";
/*
 * Import connection: ./actions -> apps/web/app/businesses/new/actions.ts.
 * addBusinessAction: Authenticates the developer, parses the business/owner/template form, calls
 * transactional provisioning, refreshes the dashboard, and returns the one-time receipt or safe form errors.
 * Type BusinessActionState: Type for business-form errors and the one-time provisioning receipt returned by
 * its Server Action.
 */
import { addBusinessAction, type BusinessActionState } from "./actions";
/*
 * Import connection: ./credential-receipt -> apps/web/app/businesses/new/credential-receipt.tsx.
 * CredentialReceipt: Shows the newly provisioned owner email, one-time temporary password, expiry, and
 * website link. Leaving the screen hides the plaintext credential; it is not a permanent password viewer.
 */
import { CredentialReceipt } from "./credential-receipt";
/*
 * Import connection: ../../../../../packages/domain/src/website-templates ->
 * packages/domain/src/website-templates.ts.
 * WEBSITE_TEMPLATES: Catalogue of standard layouts, display copy, fictional sample contact details, and
 * template metadata.
 * WEBSITE_TEMPLATE_KEYS: Allowlist of the four accepted website template keys.
 * sampleBusinessDetails: Builds fictional form values for the selected template, including a unique test
 * owner email. Filling these values does not save or publish a business.
 * Type WebsiteTemplateKey: Type restricting template selection to the supported catalogue keys.
 */
import { WEBSITE_TEMPLATES, sampleBusinessDetails, type WebsiteTemplateKey } from "../../../../../packages/domain/src/website-templates";
/*
 * Import connection: ../../../components/business-sites/business-website ->
 * apps/web/components/business-sites/business-website.tsx.
 * BusinessWebsite: Shared rendering for live sites, creation previews, editor previews, and owner previews.
 * Combines public business fields with saved content or template defaults and includes ContactForm.
 */
import { BusinessWebsite } from "../../../components/business-sites/business-website";
import { WebsiteTemplatePicker } from "../../../components/business-sites/website-template-picker";

// UI field metadata: connects stored/form keys to labels, input types, and length limits. It defines
// controls, not saved database rows.
const fields = [
  { name: "name", label: "Business name", type: "text", autoComplete: "organization", maxLength: 100 },
  { name: "first_name", label: "Owner first name", type: "text", autoComplete: "given-name", maxLength: 50 },
  { name: "last_name", label: "Owner last name", type: "text", autoComplete: "family-name", maxLength: 50 },
  { name: "owner_email", label: "Owner login email (private)", type: "email", autoComplete: "email", maxLength: 254 },
  { name: "email", label: "Business contact email (shown on website)", type: "email", autoComplete: "email", maxLength: 254 },
  { name: "phone_number", label: "Business phone number (shown on website)", type: "tel", autoComplete: "tel", maxLength: 15 },
] as const;

/*
 * Choose Bakery, Barbershop, Salon, or Contact, fill sample details, preview unsaved content, and create a
 * business plus owner account through addBusinessAction. Previewing alone creates no records.
 */
export function WebsiteBusinessForm() {
  // Connect the form to its imported Server Action: state contains the returned values/errors, the action
  // submits, and pending disables duplicate clicks.
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
        <WebsiteTemplatePicker
          value={selected}
          onChange={key => setDraft(previous => ({ ...previous, website_template: key, business_type: WEBSITE_TEMPLATES[key].businessType }))}
          error={state.fieldErrors?.website_template?.[0]}
        />
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
