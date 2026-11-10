"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WEBSITE_TEMPLATES, type WebsiteTemplateKey } from "../../../../packages/domain/src/website-templates";
import type { WebsitePlanKey } from "../../../../packages/domain/src/website-plans";
import { BusinessWebsite } from "../../components/business-sites/business-website";
import { WebsiteTemplatePicker } from "../../components/business-sites/website-template-picker";

type SignupValues = Record<
  "name" | "first_name" | "last_name" | "owner_email" | "password" | "password_confirmation" |
  "email" | "phone_number" | "description" | "business_type" | "website_template" |
  "website_plan" |
  "public_address" | "opening_hours" | "billing_street" | "billing_apt_suite" |
  "billing_city" | "billing_state" | "billing_zip",
  string
>;

const initialValues: SignupValues = {
  name: "", first_name: "", last_name: "", owner_email: "", password: "", password_confirmation: "",
  email: "", phone_number: "", description: "", business_type: "OTHER", website_template: "CONTACT",
  website_plan: "FREE",
  public_address: "", opening_hours: "", billing_street: "", billing_apt_suite: "",
  billing_city: "", billing_state: "", billing_zip: "",
};

const ownerFields = [
  { name: "first_name", label: "Owner first name", type: "text", autoComplete: "given-name", maxLength: 50 },
  { name: "last_name", label: "Owner last name", type: "text", autoComplete: "family-name", maxLength: 50 },
  { name: "owner_email", label: "Email for your account", type: "email", autoComplete: "email", maxLength: 254 },
  { name: "password", label: "Password (at least 15 characters)", type: "password", autoComplete: "new-password", maxLength: 128 },
  { name: "password_confirmation", label: "Confirm password", type: "password", autoComplete: "new-password", maxLength: 128 },
] as const;

const billingFields = [
  { name: "billing_street", label: "Street", autoComplete: "address-line1", maxLength: 200, required: true },
  { name: "billing_apt_suite", label: "Apartment / suite (optional)", autoComplete: "address-line2", maxLength: 100, required: false },
  { name: "billing_city", label: "City", autoComplete: "address-level2", maxLength: 100, required: true },
  { name: "billing_state", label: "State", autoComplete: "address-level1", maxLength: 100, required: true },
  { name: "billing_zip", label: "ZIP code", autoComplete: "postal-code", maxLength: 20, required: true },
] as const;

// Signup selects a service; stored website-plan keys retain their existing content limits.
const planListings: Record<WebsitePlanKey, { label: string; price: string; benefits: string[] }> = {
  FREE: { label: "Standard website", price: "$39/month", benefits: ["Template website and owner editing", "Hosting and maintenance", "Business-hours email support"] },
  PLUS: { label: "Website + standard CRM", price: "$79/month", benefits: ["Everything in Standard website", "Customer management", "Bookings, calendar, and notes"] },
  PREMIUM: { label: "Managed service", price: "$149/month", benefits: ["Website and standard CRM", "30 minutes of content changes monthly", "Additional work quoted separately"] },
};

export function OwnerSignupForm() {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useRef<HTMLDialogElement>(null);
  const template = values.website_template as WebsiteTemplateKey;
  const sample = WEBSITE_TEMPLATES[template];

  function update(key: keyof SignupValues, value: string) {
    setValues(current => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message ?? "Could not create your demo account.");
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    } catch {
      setError("Could not create your demo account. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <form onSubmit={submit} aria-busy={busy} className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-[#172b4d]">Owner account</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {ownerFields.map(field => <label key={field.name} className="block text-sm font-medium text-slate-700">
            {field.label}
            <input
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              maxLength={field.maxLength}
              minLength={field.name === "password" || field.name === "password_confirmation" ? 15 : undefined}
              required
              value={values[field.name]}
              onChange={event => update(field.name, event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600"
            />
          </label>)}
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <legend className="text-lg font-semibold text-[#172b4d]">Billing address</legend>
        <p className="text-sm text-slate-500">This address is private and is not shown on your public website.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {billingFields.map(field => <label key={field.name} className="block text-sm font-medium text-slate-700">
            {field.label}
            <input
              name={field.name}
              autoComplete={field.autoComplete}
              maxLength={field.maxLength}
              required={field.required}
              value={values[field.name]}
              onChange={event => update(field.name, event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600"
            />
          </label>)}
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <legend className="text-lg font-semibold text-[#172b4d]">Choose your website design</legend>
        <p className="text-sm text-slate-500">Select a starting template. You can edit and publish after simulated checkout.</p>
        <WebsiteTemplatePicker
          value={template}
          onChange={key => setValues(current => ({ ...current, website_template: key, business_type: WEBSITE_TEMPLATES[key].businessType }))}
        />
        <button type="button" onClick={() => preview.current?.showModal()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-indigo-700">Preview template ↗</button>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <legend className="text-lg font-semibold text-[#172b4d]">Business details</legend>
        <label className="block text-sm font-medium text-slate-700">Business name
          <input name="name" required maxLength={100} value={values.name} onChange={event => update("name", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />
        </label>
        <label className="block text-sm font-medium text-slate-700">What does your business do?
          <textarea name="description" required maxLength={1000} value={values.description} onChange={event => update("description", event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Business type
            <select name="business_type" value={values.business_type} onChange={event => update("business_type", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
              <option value="BAKERY">Bakery</option><option value="BARBERSHOP">Barbershop</option><option value="SALON">Salon</option><option value="SPA">Spa</option><option value="CLINIC">Clinic</option><option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Business contact email (shown on website)
            <input name="email" type="email" autoComplete="work email" required maxLength={254} value={values.email} onChange={event => update("email", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Business phone number (shown on website)
            <input name="phone_number" type="tel" autoComplete="tel" required maxLength={15} value={values.phone_number} onChange={event => update("phone_number", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Public address (optional)
            <input name="public_address" maxLength={300} value={values.public_address} onChange={event => update("public_address", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Opening hours (optional)
            <input name="opening_hours" maxLength={500} value={values.opening_hours} onChange={event => update("opening_hours", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-indigo-600" />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-6">
        <legend className="text-lg font-semibold text-[#172b4d]">Proposed service pricing</legend>
        <p className="text-sm leading-6 text-slate-500">Demo: no real charges. Signup opens simulated checkout. An active service controls website editing and CRM access; no payment details are collected. Hosting deployment and staffed support are not delivered by this demo.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(planListings) as WebsitePlanKey[]).map(planKey => {
            const plan = planListings[planKey];
            const selected = values.website_plan === planKey;
            return <label key={planKey} className={`cursor-pointer rounded-xl border p-4 transition ${selected ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-300"}`}>
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-semibold text-[#172b4d]">{plan.label}</span>
                  <span className="mt-1 block text-lg font-bold text-indigo-700">{plan.price}</span>
                </span>
                <input
                  type="radio"
                  name="website_plan"
                  value={planKey}
                  checked={selected}
                  onChange={event => update("website_plan", event.target.value)}
                  className="mt-1 accent-indigo-700"
                />
              </span>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {plan.benefits.map(benefit => <li key={benefit}>• {benefit}</li>)}
              </ul>
            </label>;
          })}
          <article className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div><h3 className="font-semibold text-[#172b4d]">Tailored website/CRM</h3><p className="mt-1 text-lg font-bold text-indigo-700">Project quote + monthly maintenance</p></div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>Custom development priced after consultation</li>
              <li>Built around your business’s specific requirements</li>
              <li>Hosting and ongoing work explicitly defined in your quote</li>
            </ul>
            <a href="/signup?option=tailored" className="inline-flex rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Request a consultation</a>
          </article>
        </div>
        <p className="text-xs leading-5 text-slate-500">Custom features and additional work are quoted separately. Managed includes CRM software access; tracked content-change requests include 30 developer minutes per UTC calendar month.</p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-6">
        <button type="submit" disabled={busy} className="rounded-xl bg-indigo-700 px-5 py-3 font-semibold text-white disabled:opacity-50">
          {busy ? "Creating your website..." : "Create account & continue to editor"}
        </button>
        <span className="text-xs text-slate-500">Local demo only. Email verification is not enabled.</span>
      </div>
    </form>

    <dialog ref={preview} className="m-auto max-h-[92vh] w-[96vw] max-w-6xl overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-950/60">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-3 text-sm">
        <strong>{sample.label} preview</strong>
        <button type="button" onClick={() => preview.current?.close()} className="rounded-lg border border-slate-300 px-3 py-1.5">Close preview</button>
      </div>
      <BusinessWebsite preview site={{
        name: values.name || sample.name,
        description: values.description || sample.description,
        websiteTemplate: template,
        email: values.email || sample.email,
        phone_number: values.phone_number || sample.phone,
        publicAddress: values.public_address || sample.address,
        openingHours: values.opening_hours || sample.hours,
      }} />
    </dialog>
  </>;
}
